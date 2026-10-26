export const HOME_GRID_MAX_WIDTH = 500;
export const HOME_GRID_BOTTOM_PADDING = 16;

const GRID_COLUMNS = 2;
const GRID_ROWS = 3;
const MIN_TILE_SIZE = 160;
const COMPACT_MIN_TILE_SIZE = 140;
const MIN_TOP_PADDING = 24;
const PREFERRED_TOP_PADDING = 85;

export type HomeGridMetrics = {
  tileSize: number;
  gridWidth: number;
  gap: number;
  contentHeight: number;
  scrollEnabled: boolean;
};

function getGridWidthMetrics(width: number) {
  const availableWidth = Math.min(HOME_GRID_MAX_WIDTH, Math.max(0, width));
  const gap = Math.min(
    availableWidth,
    Math.min(20, Math.max(12, Math.round(availableWidth * 0.04))),
  );
  const widthLimit = Math.floor((availableWidth - gap) / GRID_COLUMNS);
  return { availableWidth, gap, widthLimit };
}

/** Use the full content area below the navbar, before applying top padding. */
export function getHomeGridTopPadding({ width, height }: { width: number; height: number }) {
  const { widthLimit, gap } = getGridWidthMetrics(width);
  const fullSizeGridHeight =
    GRID_ROWS * widthLimit + (GRID_ROWS - 1) * gap + HOME_GRID_BOTTOM_PADDING;
  // Preserve the original breathing room when full-width tiles fit. Reclaim
  // empty space before shrinking tiles or enabling scrolling on short screens.
  return Math.min(PREFERRED_TOP_PADDING, Math.max(MIN_TOP_PADDING, height - fullSizeGridHeight));
}

/** Dimensions are the measured grid viewport, in layout dp. */
export function getHomeGridMetrics({
  width,
  height,
  fontScale = 1,
}: {
  width: number;
  height: number;
  fontScale?: number;
}): HomeGridMetrics {
  const { availableWidth, gap, widthLimit } = getGridWidthMetrics(width);
  const availableHeight = Math.max(0, height);
  // Narrow phones can fit three rows with compact artwork and text spacing.
  const minimumTileSize = availableWidth < 360 ? COMPACT_MIN_TILE_SIZE : MIN_TILE_SIZE;
  // Very narrow windows must still fit horizontally, even below the readable minimum.
  const minimumSize = Math.min(
    widthLimit,
    Math.ceil(minimumTileSize * Math.max(1, fontScale)),
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

/** Keep phone spacing; balance the visible tablet grid between the navbars. */
export function getHomeGridLayout({
  width,
  height,
  fontScale = 1,
  isTabletLayout = false,
}: {
  width: number;
  height: number;
  fontScale?: number;
  isTabletLayout?: boolean;
}) {
  const reservedTopPadding = getHomeGridTopPadding({ width, height });
  const metrics = getHomeGridMetrics({
    width,
    height: height - reservedTopPadding,
    fontScale,
  });
  // Bottom padding belongs to the list, not the visible tiles. Exclude it
  // when centering so the empty space above and below the tiles is equal.
  const topPadding = isTabletLayout && !metrics.scrollEnabled
    ? (height - (metrics.contentHeight - HOME_GRID_BOTTOM_PADDING)) / 2
    : reservedTopPadding;

  return { ...metrics, topPadding };
}
