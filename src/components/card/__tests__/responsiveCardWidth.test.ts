import {
  BASE_FLASHCARD_WIDTH,
  getResponsiveFlashcardMetrics,
  MAX_TABLET_FLASHCARD_WIDTH,
} from "../responsiveCardWidth";

describe("getResponsiveFlashcardMetrics", () => {
  it("keeps the phone card aspect ratio", () => {
    const metrics = getResponsiveFlashcardMetrics(411);

    expect(metrics.width).toBe(363);
    expect(metrics.minHeight).toBeCloseTo(126, 5);
    expect(metrics.contentScale).toBe(1);
    expect(metrics.fontSize).toBeCloseTo(24 * metrics.visualScale, 5);
    expect(metrics.lineHeight).toBeCloseTo(28 * metrics.visualScale, 5);
    expect(metrics.inputHeight).toBeCloseTo(52 * metrics.visualScale, 5);
    expect(metrics.textInputHeight).toBeCloseTo(44 * metrics.visualScale, 5);
  });

  it("scales tablet content with card height", () => {
    const metrics = getResponsiveFlashcardMetrics(600, {
      isTabletLayout: true,
    });

    expect(metrics.width).toBe(552);
    expect(metrics.minHeight).toBeCloseTo(191.6, 1);
    expect(metrics.contentScale).toBeCloseTo(191.6 / 126, 2);
    expect(metrics.fontSize).toBeCloseTo(24 * metrics.contentScale, 5);
    expect(metrics.inputHeight).toBeCloseTo(52 * metrics.contentScale, 5);
  });

  it("uses card-height scale at max tablet width", () => {
    const metrics = getResponsiveFlashcardMetrics(768, {
      isTabletLayout: true,
    });

    expect(metrics.width).toBe(630);
    expect(metrics.minHeight).toBeCloseTo(218.68, 1);
    expect(metrics.contentScale).toBeCloseTo(218.68 / 126, 2);
  });

  it.each([
    [BASE_FLASHCARD_WIDTH - 1, BASE_FLASHCARD_WIDTH - 1],
    [0, 0],
  ])("allows widthOverride %p and returns width %p", (widthOverride, expectedWidth) => {
    const metrics = getResponsiveFlashcardMetrics(411, { widthOverride });

    expect(metrics.width).toBe(expectedWidth);
  });

  it("clamps widthOverride above the tablet maximum", () => {
    const metrics = getResponsiveFlashcardMetrics(411, {
      widthOverride: MAX_TABLET_FLASHCARD_WIDTH + 1,
    });

    expect(metrics.width).toBe(MAX_TABLET_FLASHCARD_WIDTH);
  });
});
