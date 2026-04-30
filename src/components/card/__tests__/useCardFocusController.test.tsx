import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useCardFocusController } from "@/src/components/card/useCardFocusController";
import type { FocusTarget } from "@/src/components/card/card-types";

type ControllerProps = Parameters<typeof useCardFocusController>[0];

function createProps(overrides: Partial<ControllerProps> = {}): ControllerProps {
  return {
    isFocused: true,
    selectedItemId: 1,
    result: null,
    isIntroMode: false,
    showCorrectionInputs: false,
    correctionCardId: null,
    correctionPrimaryTarget: "correction1",
    isEditingHint: false,
    ...overrides,
  };
}

describe("useCardFocusController", () => {
  it("hands focus from normal input to correction input without clearing it", async () => {
    const { result, rerender } = renderHook(
      (props: ControllerProps) => useCardFocusController(props),
      {
        initialProps: createProps(),
      },
    );

    act(() => {
      result.current.requestFocus("main");
    });

    await waitFor(() => {
      expect(result.current.focusTarget).toBe<FocusTarget>("main");
    });

    rerender(
      createProps({
        result: false,
        showCorrectionInputs: true,
        correctionCardId: 7,
      }),
    );

    expect(result.current.focusTarget).not.toBe<FocusTarget>("none");

    await waitFor(() => {
      expect(result.current.focusTarget).toBe<FocusTarget>("correction1");
    });
  });

  it("uses the configured primary correction input when entering correction", async () => {
    const { result, rerender } = renderHook(
      (props: ControllerProps) => useCardFocusController(props),
      {
        initialProps: createProps({
          correctionPrimaryTarget: "correction2",
        }),
      },
    );

    act(() => {
      result.current.requestFocus("main");
    });

    await waitFor(() => {
      expect(result.current.focusTarget).toBe<FocusTarget>("main");
    });

    rerender(
      createProps({
        correctionPrimaryTarget: "correction2",
        result: false,
        showCorrectionInputs: true,
        correctionCardId: 8,
      }),
    );

    await waitFor(() => {
      expect(result.current.focusTarget).toBe<FocusTarget>("correction2");
    });
  });

  it("hands focus from correction back to normal input without clearing it", async () => {
    const { result, rerender } = renderHook(
      (props: ControllerProps) => useCardFocusController(props),
      {
        initialProps: createProps({
          result: false,
          showCorrectionInputs: true,
          correctionCardId: 7,
        }),
      },
    );

    await waitFor(() => {
      expect(result.current.focusTarget).toBe<FocusTarget>("correction1");
    });

    rerender(
      createProps({
        result: null,
        showCorrectionInputs: false,
        correctionCardId: null,
      }),
    );

    expect(result.current.focusTarget).not.toBe<FocusTarget>("none");

    await waitFor(() => {
      expect(result.current.focusTarget).toBe<FocusTarget>("main");
    });
  });

  it("hands focus from intro correction back to normal input", async () => {
    const { result, rerender } = renderHook(
      (props: ControllerProps) => useCardFocusController(props),
      {
        initialProps: createProps({
          isIntroMode: true,
          showCorrectionInputs: true,
          correctionCardId: 9,
        }),
      },
    );

    await waitFor(() => {
      expect(result.current.focusTarget).toBe<FocusTarget>("correction1");
    });

    rerender(
      createProps({
        isIntroMode: false,
        showCorrectionInputs: false,
        correctionCardId: null,
      }),
    );

    await waitFor(() => {
      expect(result.current.focusTarget).toBe<FocusTarget>("main");
    });
  });

  it("refocuses the correction input when the correction card changes", async () => {
    const { result, rerender } = renderHook(
      (props: ControllerProps) => useCardFocusController(props),
      {
        initialProps: createProps({
          result: false,
          showCorrectionInputs: true,
          correctionCardId: 7,
        }),
      },
    );

    await waitFor(() => {
      expect(result.current.focusTarget).toBe<FocusTarget>("correction1");
    });
    const firstCorrectionFocusRequestId = result.current.focusRequestId;

    rerender(
      createProps({
        result: false,
        showCorrectionInputs: true,
        correctionCardId: 8,
      }),
    );

    await waitFor(() => {
      expect(result.current.focusTarget).toBe<FocusTarget>("correction1");
      expect(result.current.focusRequestId).toBeGreaterThan(
        firstCorrectionFocusRequestId,
      );
    });
  });

  it("does not focus correction inputs while the card is not focus-enabled", async () => {
    const { result, rerender } = renderHook(
      (props: ControllerProps) => useCardFocusController(props),
      {
        initialProps: createProps({
          isFocused: false,
          isIntroMode: true,
          showCorrectionInputs: true,
          correctionCardId: 7,
        }),
      },
    );

    await waitFor(() => {
      expect(result.current.focusTarget).toBe<FocusTarget>("none");
    });

    rerender(
      createProps({
        isFocused: true,
        isIntroMode: true,
        showCorrectionInputs: true,
        correctionCardId: 7,
      }),
    );

    await waitFor(() => {
      expect(result.current.focusTarget).toBe<FocusTarget>("correction1");
    });
  });
});
