import type { FlashcardsImageSize } from "@/src/contexts/SettingsContext";

import {
  buildPromptImageStyle,
  getPromptImageSizeMultiplier,
} from "../promptImageSizing";

const baseMetrics = { width: 325 };
const midMetrics = { width: 477.5 };
const maxTabletMetrics = { width: 630 };

describe("prompt image sizing", () => {
  it("keeps medium at current phone size", () => {
    expect(getPromptImageSizeMultiplier("medium", baseMetrics)).toBe(0.6);
    expect(buildPromptImageStyle("medium", baseMetrics)).toEqual({
      height: 84,
      maxHeight: 84,
    });
  });

  it("progressively grows medium with card width", () => {
    expect(getPromptImageSizeMultiplier("medium", midMetrics)).toBeCloseTo(1.15);
    expect(buildPromptImageStyle("medium", midMetrics).height).toBeCloseTo(161);
  });

  it("caps medium at very large size on max tablet width", () => {
    expect(getPromptImageSizeMultiplier("medium", maxTabletMetrics)).toBe(1.7);
    expect(buildPromptImageStyle("medium", maxTabletMetrics)).toEqual({
      height: 238,
      maxHeight: 238,
    });
  });

  it("leaves non-medium sizes unchanged across card widths", () => {
    const expected: Record<Exclude<FlashcardsImageSize, "medium">, number> = {
      dynamic: 1,
      small: 0.4,
      large: 1,
      very_large: 1.7,
    };

    for (const [mode, multiplier] of Object.entries(expected)) {
      expect(
        getPromptImageSizeMultiplier(mode as FlashcardsImageSize, baseMetrics),
      ).toBe(multiplier);
      expect(
        getPromptImageSizeMultiplier(mode as FlashcardsImageSize, maxTabletMetrics),
      ).toBe(multiplier);
    }
  });
});
