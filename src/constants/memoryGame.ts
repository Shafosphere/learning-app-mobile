export type MemoryBoardSize = "twoByThree" | "threeByThree";

export const MEMORY_BOARD_LAYOUTS: Record<
  MemoryBoardSize,
  { columns: number; rows: number }
> = {
  twoByThree: { columns: 2, rows: 3 },
  threeByThree: { columns: 3, rows: 3 },
};

export const MEMORY_BOARD_SIZE_LABELS: Record<MemoryBoardSize, string> = {
  twoByThree: "2 × 3",
  threeByThree: "3 × 3",
};

export const MEMORY_BOARD_SIZE_ORDER: MemoryBoardSize[] = [
  "twoByThree",
  "threeByThree",
];

const LEGACY_MEMORY_BOARD_SIZE_MAP: Record<string, MemoryBoardSize> = {
  twoByThree: "twoByThree",
  threeByThree: "threeByThree",
  small: "twoByThree",
  medium: "threeByThree",
  large: "threeByThree",
};

export const sanitizeMemoryBoardSize = (
  value: string | null | undefined
): MemoryBoardSize => {
  if (!value) {
    return "twoByThree";
  }

  return LEGACY_MEMORY_BOARD_SIZE_MAP[value] ?? "twoByThree";
};

export const getMemoryBoardLayout = (size: MemoryBoardSize) =>
  MEMORY_BOARD_LAYOUTS[size];
