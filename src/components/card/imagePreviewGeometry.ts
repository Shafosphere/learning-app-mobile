export function fitPreviewImage(ratio: number, width: number, height: number) {
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  const imageWidth = Math.min(width, height * safeRatio);
  return { width: imageWidth, height: imageWidth / safeRatio };
}

// contentX/Y are inverse-transformed coordinates supplied by the viewer patch.
export function isOutsidePreviewImage(
  x: number,
  y: number,
  image: { width: number; height: number },
  viewport: { width: number; height: number },
) {
  return Math.abs(x - viewport.width / 2) > image.width / 2 ||
    Math.abs(y - viewport.height / 2) > image.height / 2;
}
