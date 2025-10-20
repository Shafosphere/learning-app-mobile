export function stripDiacritics(input: string): string {
  const withoutMarks = input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return withoutMarks.replace(/ł/g, "l").replace(/Ł/g, "L");
}
