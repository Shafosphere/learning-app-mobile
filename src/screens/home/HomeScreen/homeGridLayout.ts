export const HOME_GRID_MAX_WIDTH = 500;
export const HOME_GRID_BOTTOM_PADDING = 16;

type GridColumns = 2 | 3;
const GRID_SLOTS = 6;
const LANDSCAPE_GRID_MAX_WIDTH = 760;
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

function getGridWidthMetrics(width: number, columns: GridColumns) {
  const maxWidth = columns === 3 ? LANDSCAPE_GRID_MAX_WIDTH : HOME_GRID_MAX_WIDTH;
  const availableWidth = Math.min(maxWidth, Math.max(0, width));
  const gap = Math.min(
    availableWidth / (columns - 1),
    Math.min(20, Math.max(12, Math.round(availableWidth * 0.04))),
  );
  const widthLimit = Math.floor((availableWidth - (columns - 1) * gap) / columns);
  return { availableWidth, gap, widthLimit };
}

/** Use the full content area below the navbar, before applying top padding. */
export function getHomeGridTopPadding({ width, height, columns = 2 }: { width: number; height: number; columns?: GridColumns }) {
  const rows = GRID_SLOTS / columns;
  const { widthLimit, gap } = getGridWidthMetrics(width, columns);
  const fullSizeGridHeight =
    rows * widthLimit + (rows - 1) * gap + HOME_GRID_BOTTOM_PADDING;
  // Preserve the original breathing room when full-width tiles fit. Reclaim
  // empty space before shrinking tiles or enabling scrolling on short screens.
  return Math.min(PREFERRED_TOP_PADDING, Math.max(MIN_TOP_PADDING, height - fullSizeGridHeight));
}

/** Dimensions are the measured grid viewport, in layout dp. */
export function getHomeGridMetrics({
  width,
  height,
  fontScale = 1,
  columns = 2,
}: {
  width: number;
  height: number;
  fontScale?: number;
  columns?: GridColumns;
}): HomeGridMetrics {
  const rows = GRID_SLOTS / columns;
  const { availableWidth, gap, widthLimit } = getGridWidthMetrics(width, columns);
  const availableHeight = Math.max(0, height);
  // Narrow phones can fit three rows with compact artwork and text spacing.
  const minimumTileSize = availableWidth < 360 ? COMPACT_MIN_TILE_SIZE : MIN_TILE_SIZE;
  // Very narrow windows must still fit horizontally, even below the readable minimum.
  const minimumSize = Math.min(
    widthLimit,
    Math.ceil(minimumTileSize * Math.max(1, fontScale)),
  );
  const heightLimit = Math.floor(
    (availableHeight - HOME_GRID_BOTTOM_PADDING - (rows - 1) * gap) /
      rows,
  );
  const tileSize = Math.min(widthLimit, Math.max(minimumSize, heightLimit));
  const contentHeight =
    rows * tileSize + (rows - 1) * gap + HOME_GRID_BOTTOM_PADDING;

  return {
    tileSize,
    gridWidth: columns * tileSize + (columns - 1) * gap,
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
  isLandscape = false,
}: {
  width: number;
  height: number;
  fontScale?: number;
  isTabletLayout?: boolean;
  isLandscape?: boolean;
}) {
  const columns: GridColumns = isTabletLayout && isLandscape ? 3 : 2;
  const reservedTopPadding = getHomeGridTopPadding({ width, height, columns });
  const metrics = getHomeGridMetrics({
    width,
    height: height - reservedTopPadding,
    fontScale,
    columns,
  });
  // Bottom padding belongs to the list, not the visible tiles. Exclude it
  // when centering so the empty space above and below the tiles is equal.
  const topPadding = isTabletLayout && !metrics.scrollEnabled
    ? (height - (metrics.contentHeight - HOME_GRID_BOTTOM_PADDING)) / 2
    : reservedTopPadding;

  return { ...metrics, topPadding, columns };
}
