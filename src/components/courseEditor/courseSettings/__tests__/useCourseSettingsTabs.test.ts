import { act, renderHook } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useCourseSettingsTabs } from "../useCourseSettingsTabs";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

it("routes clicks through the pager, commits only completed transitions and never persists selection", () => {
  const props = { scopeKey: 7, hasAudio: true, hasResetActions: true };
  const hook = renderHook(
    (value: typeof props) => useCourseSettingsTabs(value),
    { initialProps: props },
  );
  const navigate = jest.fn();
  hook.result.current.pagerRef.current = { navigate, scrollToTop: jest.fn() };
  (AsyncStorage.setItem as jest.Mock).mockClear();
  expect(hook.result.current.activeTab).toBe("learning");
  act(() => hook.result.current.onChange("learning"));
  expect(navigate).not.toHaveBeenCalled();
  act(() => hook.result.current.onChange("appearance"));
  expect(navigate).toHaveBeenCalledWith("appearance");
  expect(hook.result.current.activeTab).toBe("learning");
  act(() => hook.result.current.onCommit("appearance"));
  expect(hook.result.current.activeTab).toBe("appearance");
  navigate.mockClear();
  act(() => hook.result.current.onChange("appearance"));
  expect(navigate).not.toHaveBeenCalled();
  hook.rerender({ ...props, scopeKey: 8 });
  expect(hook.result.current.activeTab).toBe("learning");
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it("falls back to learning if selected category disappears, without resurrecting the selection", () => {
  const props = { scopeKey: 7, hasAudio: true, hasResetActions: true };
  const hook = renderHook(
    (value: typeof props) => useCourseSettingsTabs(value),
    { initialProps: props },
  );
  act(() => hook.result.current.onCommit("audio"));
  hook.rerender({ ...props, hasAudio: false });
  expect(hook.result.current.activeTab).toBe("learning");
  expect(hook.result.current.options.map(({ key }) => key)).not.toContain(
    "audio",
  );
  act(() => hook.result.current.onCommit("audio"));
  expect(hook.result.current.activeTab).toBe("learning");
  hook.rerender(props);
  expect(hook.result.current.activeTab).toBe("learning");
  act(() => hook.result.current.onCommit("progress"));
  hook.rerender({ ...props, hasResetActions: false });
  expect(hook.result.current.activeTab).toBe("learning");
});
