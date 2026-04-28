import { renderHook, waitFor } from "@testing-library/react-native";

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
