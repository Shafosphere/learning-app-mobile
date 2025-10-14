export type MemoryBoardSize = "small" | "medium" | "large";

export const MEMORY_BOARD_LAYOUTS: Record<
  MemoryBoardSize,
  { columns: number; rows: number }
> = {
  small: { columns: 3, rows: 2 },
  medium: { columns: 3, rows: 4 },
  large: { columns: 3, rows: 6 },
};

export const MEMORY_BOARD_SIZE_LABELS: Record<MemoryBoardSize, string> = {
  small: "Mała",
  medium: "Średnia",
  large: "Duża",
};

export const MEMORY_BOARD_SIZE_ORDER: MemoryBoardSize[] = [
  "small",
  "medium",
  "large",
];

export const getMemoryBoardLayout = (size: MemoryBoardSize) =>
  MEMORY_BOARD_LAYOUTS[size];

