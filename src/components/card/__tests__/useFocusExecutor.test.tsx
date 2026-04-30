import { act, renderHook } from "@testing-library/react-native";
import type { RefObject } from "react";
import type { TextInput } from "react-native";

import { useFocusExecutor } from "@/src/components/card/useFocusExecutor";
import type { FocusTarget } from "@/src/components/card/card-types";

type MockTextInput = Pick<TextInput, "focus" | "blur">;

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
});
