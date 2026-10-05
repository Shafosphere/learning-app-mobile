export const CLASSIC_BOX_WIDTH = 115;
export const CLASSIC_BOX_SKIN_HEIGHT = 122;
export const CLASSIC_BOX_VERTICAL_EXTRA = 44;
export const PREFERRED_CLASSIC_COLUMNS = 3;

export type ClassicBoxLayout = {
  columns: number;
  scale: number;
  itemWidth: number;
};

export function getClassicBoxLayout(availableWidth: number): ClassicBoxLayout {
  const requiredWidth = CLASSIC_BOX_WIDTH * PREFERRED_CLASSIC_COLUMNS;
  const scale = Math.min(1, Math.max(0, availableWidth / requiredWidth));
  return {
    columns: PREFERRED_CLASSIC_COLUMNS,
    scale,
    itemWidth: CLASSIC_BOX_WIDTH * scale,
  };
}

export function getClassicBoxRowHeight(availableWidth: number): number {
  return Math.ceil(CLASSIC_BOX_SKIN_HEIGHT * getClassicBoxLayout(availableWidth).scale)
    + CLASSIC_BOX_VERTICAL_EXTRA;
}

export function getClassicBoxNaturalHeight(availableWidth: number, boxCount = 6): number {
  return Math.ceil(boxCount / PREFERRED_CLASSIC_COLUMNS) * getClassicBoxRowHeight(availableWidth);
}

// 44dp illustration, 24dp counter, 8dp counter margins, 4dp item padding.
export const SINGLE_ROW_BOX_MIN_HEIGHT = 80;
export function getSingleRowBoxLayout(height: number) {
  const rowHeight = Math.max(SINGLE_ROW_BOX_MIN_HEIGHT, Math.floor(height));
  const scale = Math.min(1, (rowHeight - 36) / CLASSIC_BOX_SKIN_HEIGHT);
  return { rowHeight, scale, itemWidth: Math.max(64, Math.ceil(CLASSIC_BOX_WIDTH * scale) + 16) };
}
