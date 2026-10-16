import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useHydratedPersistedState } from "../usePersistedState";

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

beforeEach(async () => { await AsyncStorage.clear(); });
afterEach(() => { jest.restoreAllMocks(); });

it("shows the latest choice immediately and serializes delayed writes", async () => {
  const hook = renderHook(() => useHydratedPersistedState("toggle", true, true));
  await waitFor(() => expect(hook.result.current[2]).toBe(true));
  const first = deferred();
  const write = jest.spyOn(AsyncStorage, "setItem").mockImplementationOnce(() => first.promise);
  let off!: Promise<void>;
  let on!: Promise<void>;
  await act(async () => { off = hook.result.current[1](false); });
  expect(hook.result.current[0]).toBe(false);
  await act(async () => { on = hook.result.current[1](true); });
  expect(hook.result.current[0]).toBe(true);
  expect(write).toHaveBeenCalledTimes(1);
  await act(async () => { first.resolve(); await Promise.all([off, on]); });
  expect(write.mock.calls).toEqual([["toggle", "false"], ["toggle", "true"]]);
  expect(await AsyncStorage.getItem("toggle")).toBe("true");
});

it("rolls back to the last successful write when queued writes fail, then permits retry", async () => {
  await AsyncStorage.setItem("setting", '"saved"');
  const hook = renderHook(() => useHydratedPersistedState("setting", "default", true));
  await waitFor(() => expect(hook.result.current[2]).toBe(true));
  const first = deferred();
  const second = deferred();
  jest.spyOn(AsyncStorage, "setItem")
    .mockImplementationOnce(() => first.promise)
    .mockImplementationOnce(() => second.promise);
  let one!: Promise<void>;
  let two!: Promise<void>;
  await act(async () => {
    one = hook.result.current[1]("one");
    two = hook.result.current[1]("two");
    void one.catch(() => {});
    void two.catch(() => {});
  });
  await act(async () => { first.reject(new Error("first failure")); await expect(one).rejects.toThrow("first failure"); });
  expect(hook.result.current[0]).toBe("two");
  await act(async () => { second.reject(new Error("second failure")); await expect(two).rejects.toThrow("second failure"); });
  expect(hook.result.current[0]).toBe("saved");
  await act(async () => { await hook.result.current[1]("two"); });
  expect(hook.result.current[0]).toBe("two");
  expect(await AsyncStorage.getItem("setting")).toBe('"two"');
});
