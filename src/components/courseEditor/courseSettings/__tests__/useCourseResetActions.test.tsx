import { act, renderHook } from "@testing-library/react-native";
import { NudgeModal } from "@/src/components/nudge/NudgeModal";
import { useCourseResetActions, type CourseResetKey } from "../useCourseResetActions";

jest.mock("@/src/components/nudge/NudgeModal", () => ({ NudgeModal: () => null }));

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

function setup() {
  const options = {
    scopeKey: 7,
    onResetSettings: jest.fn<Promise<void>, []>(async () => {}),
    onResetBoxes: jest.fn<Promise<void>, []>(async () => {}),
    onResetReviews: jest.fn<Promise<number>, []>(async () => 3),
    onResetAll: jest.fn<Promise<void>, []>(async () => {}),
  };
  return { options, ...renderHook(() => useCourseResetActions(options)) };
}

it.each(["settings", "boxes", "reviews", "all"] as CourseResetKey[])("confirms %s through NudgeModal and allows cancellation", async (key) => {
  const { result, options } = setup();
  const action = () => result.current.resetActions.find((action) => action.key === key)!;
  act(() => action().onPress());
  expect(result.current.modal?.type).toBe(NudgeModal);
  expect(result.current.modal?.props.confirmColor).toBe(key === "settings" ? "my_yellow" : "my_red");
  act(() => result.current.modal?.props.onSecondaryPress());
  expect(result.current.modal).toBeNull();
  for (const callback of [options.onResetSettings, options.onResetBoxes, options.onResetReviews, options.onResetAll]) expect(callback).not.toHaveBeenCalled();
  act(() => action().onPress());
  await act(async () => { await result.current.modal?.props.onConfirm(); });
  expect(result.current.modal?.props.title).toContain(key === "settings" ? "doneTitle" : "DoneTitle");
  const callbacks = { settings: options.onResetSettings, boxes: options.onResetBoxes, reviews: options.onResetReviews, all: options.onResetAll };
  expect(callbacks[key]).toHaveBeenCalledTimes(1);
  act(() => result.current.modal?.props.onConfirm());
  expect(result.current.modal).toBeNull();
});

it("locks every reset, closing and duplicate confirmation until the write completes", async () => {
  const { result, options } = setup();
  let finish!: () => void;
  options.onResetSettings.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
  act(() => result.current.resetActions[0].onPress());
  const confirm = result.current.modal!.props.onConfirm;
  act(() => { confirm(); confirm(); });
  expect(options.onResetSettings).toHaveBeenCalledTimes(1);
  expect(result.current.resetActions.every((action) => action.disabled)).toBe(true);
  expect(result.current.modal!.props.confirmDisabled).toBe(true);
  act(() => {
    result.current.modal!.props.onClose();
    result.current.resetActions[1].onPress();
  });
  expect(result.current.modal!.props.title).toBe("courseSettingsReset.confirmTitle");
  await act(async () => { finish(); });
  expect(result.current.modal!.props.title).toBe("courseSettingsReset.doneTitle");
});

it.each(["settings", "boxes", "reviews", "all"] as const)("shows error without success when %s fails", async (key) => {
  const { result, options } = setup();
  const callbacks = { settings: options.onResetSettings, boxes: options.onResetBoxes, reviews: options.onResetReviews, all: options.onResetAll };
  callbacks[key].mockRejectedValueOnce(new Error("Storage unavailable"));
  act(() => result.current.resetActions.find((action) => action.key === key)!.onPress());
  await act(async () => { await result.current.modal!.props.onConfirm(); });
  expect(result.current.modal!.props.title).toBe("app.status.error");
  expect(result.current.modal!.props.description).toContain(key === "settings" ? "failed" : "Failed");
  expect(result.current.resetActions.every((action) => !action.disabled)).toBe(true);
});

it("does not open resets while settings are loading", () => {
  const options = { scopeKey: 7, disabled: true, onResetSettings: jest.fn(), onResetBoxes: jest.fn(), onResetReviews: jest.fn(), onResetAll: jest.fn() };
  const { result } = renderHook(() => useCourseResetActions(options));
  act(() => result.current.resetActions[0].onPress());
  expect(result.current.modal).toBeNull();
  expect(result.current.resetActions.every((action) => action.disabled)).toBe(true);
});
