export const HOME_GRID_MAX_WIDTH = 500;
export const HOME_GRID_BOTTOM_PADDING = 16;

const GRID_COLUMNS = 2;
const GRID_ROWS = 3;
const MIN_TILE_SIZE = 160;

export type HomeGridMetrics = {
  tileSize: number;
  gridWidth: number;
  gap: number;
  contentHeight: number;
  scrollEnabled: boolean;
};

/** Dimensions are the measured viewport below the quote, in layout dp. */
export function getHomeGridMetrics({
  width,
  height,
  fontScale = 1,
}: {
  width: number;
  height: number;
  fontScale?: number;
}): HomeGridMetrics {
  const availableWidth = Math.min(HOME_GRID_MAX_WIDTH, Math.max(0, width));
  const availableHeight = Math.max(0, height);
  const gap = Math.min(
    availableWidth,
    Math.min(20, Math.max(12, Math.round(availableWidth * 0.04))),
  );
  const widthLimit = Math.floor((availableWidth - gap) / GRID_COLUMNS);
  // Very narrow windows must still fit horizontally, even below the readable minimum.
  const minimumSize = Math.min(
    widthLimit,
    Math.ceil(MIN_TILE_SIZE * Math.max(1, fontScale)),
  );
  const heightLimit = Math.floor(
    (availableHeight - HOME_GRID_BOTTOM_PADDING - (GRID_ROWS - 1) * gap) /
      GRID_ROWS,
  );
  const tileSize = Math.min(widthLimit, Math.max(minimumSize, heightLimit));
  const contentHeight =
    GRID_ROWS * tileSize + (GRID_ROWS - 1) * gap + HOME_GRID_BOTTOM_PADDING;

  return {
    tileSize,
    gridWidth: GRID_COLUMNS * tileSize + gap,
    gap,
    contentHeight,
    scrollEnabled: contentHeight > availableHeight,
  };
}
