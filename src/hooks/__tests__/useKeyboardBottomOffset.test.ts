import { act, renderHook } from "@testing-library/react-native";
import { useKeyboardBottomOffset } from "../useKeyboardBottomOffset";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

it("clears a raised keyboard offset immediately when disabled", () => {
  const { result, rerender } = renderHook<ReturnType<typeof useKeyboardBottomOffset>, { enabled: boolean }>(
    ({ enabled }) => useKeyboardBottomOffset({ enabled }),
    { initialProps: { enabled: true } },
  );
  act(() => result.current.bottomOffset.setValue(230));
  rerender({ enabled: false });
  expect((result.current.bottomOffset as unknown as { __getValue: () => number }).__getValue()).toBe(0);
});
