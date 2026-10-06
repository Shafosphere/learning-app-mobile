import { getHomeGridMetrics } from "../homeGridLayout";

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
      tileSize: 153,
      gridWidth: 319,
      gap: 13,
      contentHeight: 501,
      scrollEnabled: true,
    });
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
