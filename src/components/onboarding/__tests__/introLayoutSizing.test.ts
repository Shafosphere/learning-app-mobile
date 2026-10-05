import { getIntroIllustrationWidth, getIntroSpacing } from "../introLayoutSizing";

const aspectRatio = 1179 / 879;

describe("intro illustration sizing", () => {
  it.each([
    [284, 260, 227.2], // Narrow phone, ample height.
    [324, 150, 150 * aspectRatio], // Height constrains the image.
    [354, 300, 283.2], // Tall phone.
    [424, 600, 339.2], // Tablet content column.
    [800, 600, 340], // Upper bound.
    [324, 0, 180], // Large fonts: readable minimum, scroll remainder.
    [324, -100, 180],
    [140, 0, 112], // Minimum never exceeds preferred width.
  ])("width %s and available height %s produce width %s", (contentWidth, availableHeight, expected) => {
    expect(getIntroIllustrationWidth({ contentWidth, availableHeight, aspectRatio })).toBeCloseTo(expected);
  });

  it("reduces spacing and logo on short screens without exceeding bounds", () => {
    expect(getIntroSpacing(300)).toEqual(getIntroSpacing(480));
    expect(getIntroSpacing(480).logoWidth).toBe(72);
    expect(getIntroSpacing(580).logoWidth).toBe(90);
    expect(getIntroSpacing(680).logoWidth).toBe(108);
    expect(getIntroSpacing(1200)).toEqual(getIntroSpacing(680));
  });
});
