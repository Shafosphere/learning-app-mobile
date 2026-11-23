import { fitPreviewImage, isOutsidePreviewImage } from "../imagePreviewGeometry";

describe("image preview geometry", () => {
  it("contains portrait, landscape and panoramic images without stretching", () => {
    expect(fitPreviewImage(0.5, 400, 600)).toEqual({ width: 300, height: 600 });
    expect(fitPreviewImage(2, 400, 600)).toEqual({ width: 400, height: 200 });
    expect(fitPreviewImage(10, 400, 600)).toEqual({ width: 400, height: 40 });
    expect(fitPreviewImage(NaN, 400, 600)).toEqual({ width: 400, height: 400 });
  });

  it("only dismisses taps outside the actual image, using inverse-transformed coordinates", () => {
    const viewport = { width: 400, height: 600 };
    const image = { width: 400, height: 200 };
    expect(isOutsidePreviewImage(200, 300, image, viewport)).toBe(false);
    expect(isOutsidePreviewImage(0, 200, image, viewport)).toBe(false);
    expect(isOutsidePreviewImage(200, 100, image, viewport)).toBe(true);
    expect(isOutsidePreviewImage(401, 300, image, viewport)).toBe(true);
  });
});
