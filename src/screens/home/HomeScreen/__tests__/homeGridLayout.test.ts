import {
  getHomeGridLayout,
  getHomeGridMetrics,
  getHomeGridTopPadding,
  HOME_GRID_BOTTOM_PADDING,
} from "../homeGridLayout";

describe("getHomeGridLayout tablet spacing", () => {
  it.each([
    [456, 788, 1],
    [756, 734, 1],
    [1056, 1000, 1],
    [756, 1100, 1.4],
  ])("balances visible tile margins at %s × %s with font scale %s", (width, height, fontScale) => {
    const layout = getHomeGridLayout({ width, height, fontScale, isTabletLayout: true });
    const visibleGridHeight = layout.contentHeight - HOME_GRID_BOTTOM_PADDING;
    const bottomSpace = height - layout.topPadding - visibleGridHeight;
    expect(layout.scrollEnabled).toBe(false);
    expect(layout.topPadding).toBeCloseTo(bottomSpace);
    expect(layout.topPadding).toBeGreaterThanOrEqual(HOME_GRID_BOTTOM_PADDING);
    expect(layout.gridWidth).toBeLessThanOrEqual(width);
  });

  it("preserves readable tile sizes and scrolling in short tablet windows", () => {
    const layout = getHomeGridLayout({ width: 1056, height: 464, isTabletLayout: true });
    expect(layout.tileSize).toBe(160);
    expect(layout.topPadding).toBe(24);
    expect(layout.scrollEnabled).toBe(true);
  });

  it.each([
    [320, 488, 24],
    [372, 640, 60],
    [372, 760, 85],
  ])("preserves phone spacing at %s × %s", (width, height, topPadding) => {
    expect(getHomeGridLayout({ width, height }).topPadding).toBe(topPadding);
  });
});

describe("getHomeGridTopPadding", () => {
  it.each([
    [372, 760],
    [320, 800],
    [900, 1100],
  ])("preserves the original top spacing when the full grid fits at %s × %s", (width, height) => {
    const topPadding = getHomeGridTopPadding({ width, height });
    expect(topPadding).toBe(85);
    expect(getHomeGridMetrics({ width, height: height - topPadding }).scrollEnabled).toBe(false);
  });

  it.each([
    [320, 488],
    [280, 416],
    [900, 464],
  ])("reclaims top space on short viewports at %s × %s", (width, height) => {
    expect(getHomeGridTopPadding({ width, height })).toBe(24);
  });

  it("reduces padding smoothly before reducing full-size tiles", () => {
    const spacings = [665, 640, 604].map((height) => {
      const topPadding = getHomeGridTopPadding({ width: 372, height });
      const metrics = getHomeGridMetrics({ width: 372, height: height - topPadding });
      expect(metrics.tileSize).toBe(178);
      expect(metrics.scrollEnabled).toBe(false);
      return topPadding;
    });
    expect(spacings).toEqual([85, 60, 24]);
    expect(getHomeGridMetrics({ width: 372, height: 603 - 24 }).tileSize).toBe(177);
  });
});

describe("getHomeGridMetrics", () => {
  it("fits a phone by width when all three rows have enough height", () => {
    expect(getHomeGridMetrics({ width: 372, height: 590 })).toEqual({
      tileSize: 178,
      gridWidth: 371,
      gap: 15,
      contentHeight: 580,
      scrollEnabled: false,
    });
  });

  it("narrows a tablet grid to fit all three rows by height", () => {
    expect(getHomeGridMetrics({ width: 900, height: 710 })).toEqual({
      tileSize: 218,
      gridWidth: 456,
      gap: 20,
      contentHeight: 710,
      scrollEnabled: false,
    });
  });

  it("caps the grid width even on a large tablet", () => {
    const metrics = getHomeGridMetrics({ width: 1400, height: 1800 });
    expect(metrics.gridWidth).toBe(500);
    expect(metrics.tileSize).toBe(240);
    expect(metrics.scrollEnabled).toBe(false);
  });

  it("uses scrolling on a small phone without horizontal overflow", () => {
    expect(getHomeGridMetrics({ width: 320, height: 430 })).toEqual({
      tileSize: 140,
      gridWidth: 293,
      gap: 13,
      contentHeight: 462,
      scrollEnabled: true,
    });
  });

  it("fits three compact rows on a 360 × 640 phone below the navbar and top spacing", () => {
    const metrics = getHomeGridMetrics({ width: 320, height: 464 });
    expect(metrics.tileSize).toBe(140);
    expect(metrics.contentHeight).toBeLessThanOrEqual(464);
    expect(metrics.scrollEnabled).toBe(false);
  });

  it("keeps compact tiles readable and scrollable on a 320 × 568 phone", () => {
    const metrics = getHomeGridMetrics({ width: 280, height: 392 });
    expect(metrics.gridWidth).toBeLessThanOrEqual(280);
    expect(metrics.tileSize).toBe(134);
    expect(metrics.scrollEnabled).toBe(true);
  });

  it("enables scrolling when compact phone text is enlarged", () => {
    const metrics = getHomeGridMetrics({ width: 320, height: 464, fontScale: 1.25 });
    expect(metrics.tileSize).toBe(153);
    expect(metrics.scrollEnabled).toBe(true);
  });

  it.each([
    [535, true],
    [536, false],
    [537, false],
  ])("handles the readable-size boundary at height %p", (height, scrolling) => {
    const metrics = getHomeGridMetrics({ width: 900, height });
    expect(metrics.tileSize).toBe(160);
    expect(metrics.scrollEnabled).toBe(scrolling);
  });

  it("preserves larger touch targets for increased text instead of shrinking to fit", () => {
    const standard = getHomeGridMetrics({ width: 900, height: 590 });
    const enlarged = getHomeGridMetrics({ width: 900, height: 590, fontScale: 1.25 });
    expect(standard.scrollEnabled).toBe(false);
    expect(enlarged.tileSize).toBe(200);
    expect(enlarged.contentHeight).toBe(656);
    expect(enlarged.scrollEnabled).toBe(true);
  });

  it("still respects the available width with increased text", () => {
    const metrics = getHomeGridMetrics({ width: 320, height: 800, fontScale: 2 });
    expect(metrics.gridWidth).toBeLessThanOrEqual(320);
    expect(metrics.tileSize).toBe(153);
  });

  it("does not reduce the readable minimum for smaller system text", () => {
    expect(getHomeGridMetrics({ width: 900, height: 430, fontScale: 0.8 }).tileSize)
      .toBe(160);
  });

  it("rounds down for fractional viewport dimensions so the final row fits", () => {
    const metrics = getHomeGridMetrics({ width: 499.5, height: 709.9 });
    expect(metrics.gridWidth).toBeLessThanOrEqual(499.5);
    expect(metrics.contentHeight).toBeLessThanOrEqual(709.9);
    expect(metrics.scrollEnabled).toBe(false);
  });

  it.each([0, 8, -10])("has no negative sizes or overflow at width %p", (width) => {
    const metrics = getHomeGridMetrics({ width, height: 0 });
    expect(metrics.tileSize).toBeGreaterThanOrEqual(0);
    expect(metrics.gridWidth).toBeLessThanOrEqual(Math.max(0, width));
  });

  it("keeps readable tiles in a collapsed viewport for later scrolling", () => {
    const metrics = getHomeGridMetrics({ width: 500, height: 0 });
    expect(metrics.tileSize).toBe(160);
    expect(metrics.scrollEnabled).toBe(true);
  });
});


describe("landscape tablet home", () => {
  it.each([[880, 460], [1056, 734], [1222, 900]])(
    "fits two centered rows at %s × %s",
    (width, height) => {
      const layout = getHomeGridLayout({ width, height, isTabletLayout: true, isLandscape: true });
      expect(layout.columns).toBe(3);
      expect(layout.gridWidth).toBeLessThanOrEqual(Math.min(width, 760));
      expect(layout.scrollEnabled).toBe(false);
      const visibleHeight = 2 * layout.tileSize + layout.gap;
      expect(layout.topPadding).toBeCloseTo((height - visibleHeight) / 2);
    },
  );

  it("keeps enlarged text tiles readable and scrollable in short windows", () => {
    const layout = getHomeGridLayout({
      width: 1056, height: 350, fontScale: 1.4, isTabletLayout: true, isLandscape: true,
    });
    expect(layout.columns).toBe(3);
    expect(layout.tileSize).toBe(224);
    expect(layout.scrollEnabled).toBe(true);
  });

  it("keeps phones in two columns in landscape", () => {
    expect(getHomeGridLayout({ width: 760, height: 240, isLandscape: true }).columns).toBe(2);
  });

  it.each([0, 8, -10])("avoids negative dimensions in a collapsed window of width %s", (width) => {
    const layout = getHomeGridLayout({ width, height: 0, isTabletLayout: true, isLandscape: true });
    expect(layout.tileSize).toBeGreaterThanOrEqual(0);
    expect(layout.gridWidth).toBeLessThanOrEqual(Math.max(0, width));
  });
});
