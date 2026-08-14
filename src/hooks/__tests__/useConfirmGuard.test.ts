import { act, renderHook } from "@testing-library/react-native";

import {
  CONFIRM_GUARD_MS,
  useConfirmGuard,
} from "@/src/hooks/useConfirmGuard";

describe("useConfirmGuard", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("blocks confirmation after card change and allows it after 2 seconds", () => {
    const hook = renderHook(
      (props: { cardId: number }) => useConfirmGuard(props.cardId, false),
      { initialProps: { cardId: 1 } },
    );

    expect(hook.result.current()).toBe(true);

    hook.rerender({ cardId: 2 });
    expect(hook.result.current()).toBe(false);

    act(() => {
      jest.advanceTimersByTime(CONFIRM_GUARD_MS);
    });

    expect(hook.result.current()).toBe(true);
  });

  it("restarts guard when correction mode starts", () => {
    const hook = renderHook(
      (props: { correctionActive: boolean }) =>
        useConfirmGuard(1, props.correctionActive),
      { initialProps: { correctionActive: false } },
    );

    act(() => {
      jest.advanceTimersByTime(CONFIRM_GUARD_MS);
    });
    expect(hook.result.current()).toBe(true);

    hook.rerender({ correctionActive: true });
    expect(hook.result.current()).toBe(false);

    act(() => {
      jest.advanceTimersByTime(CONFIRM_GUARD_MS);
    });
    expect(hook.result.current()).toBe(true);
  });
});
