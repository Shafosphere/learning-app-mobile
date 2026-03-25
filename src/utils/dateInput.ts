export type DatePattern = "ym" | "ymd";

export const getDateInputPlaceholder = (
  pattern: DatePattern | null | undefined,
): string => {
  if (pattern === "ymd") {
    return "YYYY-MM-DD";
  }
  if (pattern === "ym") {
    return "YYYY-MM";
  }
  return "";
};
