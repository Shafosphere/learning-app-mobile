import { getReviewEmptyLayout, REVIEW_EMPTY_MESSAGE_GAP } from "../reviewEmptyLayout";

it.each([
  [320, 400, true, false],
  [360, 560, true, false],
  [390, 650, false, false],
  [800, 1000, false, true],
  [844, 260, true, false],
  [1024, 540, false, true],
] as const)("fits the illustration and caption in a %s × %s viewport", (width, height, isCompact, isTablet) => {
  const layout = getReviewEmptyLayout({ width, height, isCompact, isTablet, messageHeight: 64 });
  expect(layout.boxWidth).toBeLessThanOrEqual(width - 48);
  expect(layout.paddingTop - 150 * layout.scale).toBeGreaterThanOrEqual(16 - 0.001);
  expect(layout.paddingTop + layout.boxHeight + REVIEW_EMPTY_MESSAGE_GAP + 64 + 16).toBeLessThanOrEqual(height + 0.001);
});

it.each([
  [360, 640, true, false, 144.5],
  [390, 700, false, false, 170],
  [800, 1000, false, true, 221],
] as const)("centers the whole group at 42 percent of a %s × %s viewport", (width, height, isCompact, isTablet, expectedWidth) => {
  const layout = getReviewEmptyLayout({ width, height, isCompact, isTablet, messageHeight: 60 });
  expect(layout.boxWidth).toBe(expectedWidth);
  const visibleTop = layout.paddingTop - 150 * layout.scale;
  const visibleBottom = layout.paddingTop + layout.boxHeight + REVIEW_EMPTY_MESSAGE_GAP + 60;
  expect((visibleTop + visibleBottom) / 2).toBeCloseTo(height * 0.42);
  expect(REVIEW_EMPTY_MESSAGE_GAP).toBe(28);
});

it("moves up for enlarged text, then allows overflow for scrolling", () => {
  const options = { width: 360, height: 500, isCompact: true, isTablet: false };
  const normal = getReviewEmptyLayout({ ...options, messageHeight: 60 });
  const enlarged = getReviewEmptyLayout({ ...options, messageHeight: 200 });
  const huge = getReviewEmptyLayout({ ...options, messageHeight: 800 });
  expect(enlarged.paddingTop).toBeLessThan(normal.paddingTop);
  expect(huge.paddingTop - 150 * huge.scale).toBeCloseTo(16);
  expect(huge.paddingTop + huge.boxHeight + REVIEW_EMPTY_MESSAGE_GAP + 800).toBeGreaterThan(options.height);
});

it("keeps the full clock below the header on the reported phone viewport", () => {
  const layout = getReviewEmptyLayout({ width: 358, height: 667, isCompact: true, isTablet: false, messageHeight: 56 });
  // The clock image starts 150 points above the unscaled box, not 32.
  expect(layout.paddingTop - 150 * layout.scale).toBeGreaterThanOrEqual(16);
  expect(layout.boxWidth).toBe(144.5);
});

it("uses a larger illustration on landscape tablets while keeping the clock inside the viewport", () => {
  const options = { width: 960, height: 428, isCompact: false, messageHeight: 100, isLandscape: true };
  const tablet = getReviewEmptyLayout({ ...options, isTablet: true });
  const phone = getReviewEmptyLayout({ ...options, isTablet: false });
  expect(tablet.boxWidth).toBeGreaterThan(phone.boxWidth);
  expect(272 * tablet.scale + 32).toBeLessThanOrEqual(options.height + 0.001);
});


it.each([[720, 333], [480, 260], [650, 300]])("fits the full clock beside the caption in a %s × %s landscape viewport", (width, height) => {
  const layout = getReviewEmptyLayout({ width, height, isCompact: true, isTablet: false, messageHeight: 100, isLandscape: true });
  expect(layout.boxWidth).toBeGreaterThan(0);
  expect(layout.paddingTop).toBe(16);
  expect(272 * layout.scale + 32).toBeLessThanOrEqual(height + 0.001);
  expect(layout.boxWidth + 32).toBeLessThan(width - 48);
});
