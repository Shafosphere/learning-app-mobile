export type AnswerInputKind = "text" | "number" | "year" | "date";

export function detectInputKind(value: string): AnswerInputKind {
  const trimmed = value.trim();
  if (/^\d{3,4}-\d{2}(?:-\d{2})?$/.test(trimmed)) return "date";
  if (/^\d{3,4}$/.test(trimmed)) return "year";
  if (/^\d+(?:[.,]\d+)?$/.test(trimmed)) return "number";
  return "text";
}

export function resolveInputKind(values: string[]): AnswerInputKind {
  const kinds = values.filter((value) => value.trim().length > 0).map(detectInputKind);
  if (kinds.length === 0) return "text";
  if (kinds.every((kind) => kind === "date")) return "date";
  if (kinds.every((kind) => kind === "year")) return "year";
  if (kinds.every((kind) => kind === "number" || kind === "year")) return "number";
  return "text";
}
