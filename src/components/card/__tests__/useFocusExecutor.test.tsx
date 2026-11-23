import { act, renderHook } from "@testing-library/react-native";
import type { RefObject } from "react";
import type { TextInput } from "react-native";

import { useFocusExecutor } from "@/src/components/card/useFocusExecutor";
import type { FocusTarget } from "@/src/components/card/card-types";

type MockTextInput = { focus: jest.Mock; blur: jest.Mock };

function createInputRef() {
  return {
    current: {
      focus: jest.fn(),
      blur: jest.fn(),
    } as unknown as TextInput,
  } satisfies RefObject<TextInput | null>;
}

function createRefs() {
  return {
    main: createInputRef(),
    correction1: createInputRef(),
    correction2: createInputRef(),
    hint: createInputRef(),
  };
}

function input(ref: RefObject<TextInput | null>) {
  return ref.current as unknown as MockTextInput;
}

describe("useFocusExecutor", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it.each([
    ["main", "correction1"],
    ["correction1", "correction2"],
    ["correction2", "main"],
  ] satisfies [Exclude<FocusTarget, "none">, Exclude<FocusTarget, "none">][])(
    "hands focus from %s to %s without blurring the previous input",
    (fromTarget, toTarget) => {
      const refs = createRefs();
      const { rerender } = renderHook(
        ({
          focusTarget,
          focusRequestId,
        }: {
          focusTarget: FocusTarget;
          focusRequestId: number;
        }) =>
          useFocusExecutor({
            focusTarget,
            focusRequestId,
            refs,
          }),
        {
          initialProps: {
            focusTarget: fromTarget,
            focusRequestId: 1,
          },
        },
      );

      expect(input(refs[fromTarget]).focus).toHaveBeenCalledTimes(1);

      rerender({
        focusTarget: toTarget,
        focusRequestId: 2,
      });

      expect(input(refs[toTarget]).focus).toHaveBeenCalledTimes(1);
      expect(input(refs[fromTarget]).blur).not.toHaveBeenCalled();
    },
  );

  it("blurs the active input only when focus target becomes none", () => {
    const refs = createRefs();
    const { rerender } = renderHook(
      ({
        focusTarget,
        focusRequestId,
      }: {
        focusTarget: FocusTarget;
        focusRequestId: number;
      }) =>
        useFocusExecutor({
          focusTarget,
          focusRequestId,
          refs,
        }),
      {
        initialProps: {
          focusTarget: "correction1" as FocusTarget,
          focusRequestId: 1,
        },
      },
    );

    rerender({
      focusTarget: "none",
      focusRequestId: 2,
    });

    expect(input(refs.correction1).blur).toHaveBeenCalledTimes(1);
  });

  it("retries focus after native handoff delays", () => {
    const refs = createRefs();

    renderHook(() =>
      useFocusExecutor({
        focusTarget: "main",
        focusRequestId: 1,
        refs,
      }),
    );

    expect(input(refs.main).focus).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(input(refs.main).focus).toHaveBeenCalledTimes(2);

    act(() => {
      jest.advanceTimersByTime(70);
    });

    expect(input(refs.main).focus).toHaveBeenCalledTimes(3);
  });
  it("suppresses retries during a preview and restores only the previously focused field", () => {
    const refs = createRefs();
    refs.correction1.current.isFocused = jest.fn(() => true);
    const { rerender } = renderHook(({ suspended }: { suspended: boolean }) => useFocusExecutor({
      suspended, scopeKey: 1, focusTarget: "correction1", focusRequestId: 1, refs,
    }), { initialProps: { suspended: false } });
    rerender({ suspended: true });
    const callsBefore = input(refs.correction1).focus.mock.calls.length;
    act(() => jest.advanceTimersByTime(500));
    expect(input(refs.correction1).focus).toHaveBeenCalledTimes(callsBefore);
    rerender({ suspended: false });
    act(() => jest.advanceTimersByTime(250));
    expect(input(refs.correction1).focus).toHaveBeenCalledTimes(callsBefore + 1);
    expect(input(refs.main).focus).not.toHaveBeenCalled();
  });

  it.each([false, true])("does not open a keyboard after closing when no input was focused or the card changed (%s)", (changed) => {
    const refs = createRefs();
    refs.main.current.isFocused = jest.fn(() => changed);
    const { rerender } = renderHook(({ suspended, scopeKey }: { suspended: boolean; scopeKey: number }) => useFocusExecutor({
      suspended, scopeKey, focusTarget: "main", focusRequestId: 1, refs,
    }), { initialProps: { suspended: true, scopeKey: 1 } });
    rerender({ suspended: false, scopeKey: changed ? 2 : 1 });
    act(() => jest.advanceTimersByTime(500));
    expect(input(refs.main).focus).not.toHaveBeenCalled();
  });

});
