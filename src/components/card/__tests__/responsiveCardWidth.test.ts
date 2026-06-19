import { getResponsiveFlashcardMetrics } from "../responsiveCardWidth";

describe("getResponsiveFlashcardMetrics", () => {
  it("keeps the phone card aspect ratio", () => {
    const metrics = getResponsiveFlashcardMetrics(411);

    expect(metrics.width).toBe(363);
    expect(metrics.minHeight).toBeCloseTo(126, 5);
  });

  it("derives tablet height from the card width", () => {
    const metrics = getResponsiveFlashcardMetrics(600);

    expect(metrics.width).toBe(552);
    expect(metrics.minHeight).toBeCloseTo(191.6, 1);
  });

  it("uses ratio-based height at max tablet width", () => {
    const metrics = getResponsiveFlashcardMetrics(768);

    expect(metrics.width).toBe(630);
    expect(metrics.minHeight).toBeCloseTo(218.68, 1);
  });
});
