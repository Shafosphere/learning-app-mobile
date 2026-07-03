import { getProportionalLayoutMetrics } from "../useProportionalLayout";

const getMetrics = (width: number, height: number) =>
  getProportionalLayoutMetrics({
    width,
    height,
    referenceWidth: 320,
    referenceHeight: 632,
    horizontalInset: 20,
    verticalInsetPercentage: 5,
  });

describe("getProportionalLayoutMetrics", () => {
  it("converts percentages from the measured viewport height", () => {
    const metrics = getMetrics(800, 1200);

    expect(metrics.verticalInset).toBeCloseTo(60);
    expect(metrics.contentHeight).toBeCloseTo(1080);
    expect(metrics.heightFor(34.5)).toBeCloseTo(372.6);
    expect(metrics.heightFor(7.9)).toBeCloseTo(85.32);
  });

  it("scales visuals continuously between viewport sizes", () => {
    const phone = getMetrics(360, 632);
    const tablet7 = getMetrics(600, 960);
    const tablet10 = getMetrics(800, 1280);

    expect(phone.visualScale).toBeCloseTo(0.9);
    expect(tablet7.visualScale).toBeGreaterThan(phone.visualScale);
    expect(tablet10.visualScale).toBeGreaterThan(tablet7.visualScale);
  });

  it("constrains visual scale by available width", () => {
    const narrowTall = getMetrics(360, 1264);
    const wideTall = getMetrics(800, 1264);

    expect(narrowTall.visualScale).toBeCloseTo(1);
    expect(wideTall.visualScale).toBeCloseTo(1.8);
  });
});
