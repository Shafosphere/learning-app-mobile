import type {
  CsvCardType,
  CsvAnalysisResult,
  CsvIssue,
  NormalizedCsvRow,
  ParsedCsvInput,
} from "@/src/features/customCourse/csvImport/types";
import { getCsvFieldLabel, parseCsvCardType } from "./schema";

const KNOWN_HEADERS = new Set([
  "type",
  "front_text",
  "back_text",
  "front_image",
  "back_image",
  "tf_answer",
  "flip",
  "explanation",
]);

const TRUE_VALUES = new Set(["true", "1", "yes", "y", "tak", "t"]);

const asTrimmedString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : `${value ?? ""}`.trim();

const hasValue = (value: unknown): boolean => asTrimmedString(value).length > 0;

const parseBooleanValue = (value: unknown): boolean => {
  const normalized = asTrimmedString(value).toLowerCase();
  return TRUE_VALUES.has(normalized);
};

const mapCsvTypeToManualType = (type: CsvCardType) => {
  if (type === "traditional") return "text" as const;
  if (type === "true_false") return "true_false" as const;
  return "know_dont_know" as const;
};

export const analyzeRows = (
  input: ParsedCsvInput,
  options?: { locale?: "pl" | "en" }
): CsvAnalysisResult => {
  const locale = options?.locale === "en" ? "en" : "pl";
  const isPolish = locale === "pl";
  const issues: CsvIssue[] = [...input.parseIssues];
  const validRows: NormalizedCsvRow[] = [];
  const statsByType: Record<CsvCardType, number> = {
    traditional: 0,
    true_false: 0,
    self_assess: 0,
  };

  let inferredTypeCount = 0;
  let missingImageCount = 0;

  const unknownHeaders = input.headers.filter(
    (header) => header.length > 0 && !KNOWN_HEADERS.has(header.toLowerCase())
  );

  if (unknownHeaders.length > 0) {
    issues.push({
      row: null,
      field: "header",
      severity: "warning",
      code: "unknown_header",
      message: isPolish
        ? `Nieznane kolumny: ${unknownHeaders
            .map((header) => getCsvFieldLabel(header, locale))
            .join(", ")}. Zostaną zignorowane.`
        : `Unknown columns: ${unknownHeaders
            .map((header) => getCsvFieldLabel(header, locale))
            .join(", ")}. They will be ignored.`,
    });
  }

  for (const row of input.rows) {
    const rowIssues: CsvIssue[] = [];

    const explicitType = parseCsvCardType(row.raw.type);
    const hasTypeValue = hasValue(row.raw.type);
    const hasTfAnswer = hasValue(row.raw.tf_answer);

    if (hasTypeValue && !explicitType) {
      rowIssues.push({
        row: row.rowNumber,
        field: "type",
        severity: "error",
        code: "invalid_type",
        message: isPolish
          ? "Niepoprawny typ. Dozwolone: traditional, true_false, self_assess, odpowiedz_tekstowa, prawda_falsz, samoocena."
          : "Invalid type. Allowed: traditional, true_false, self_assess, text, prawda_falsz, samoocena.",
      });
    }

    const resolvedType: CsvCardType = explicitType ?? (hasTfAnswer ? "true_false" : "traditional");
    const typeInferred = !explicitType;

    if (typeInferred) {
      inferredTypeCount += 1;
      rowIssues.push({
        row: row.rowNumber,
        field: "type",
        severity: "warning",
        code: "inferred_type",
        message: isPolish
          ? `Brak typu, ustawiono automatycznie: ${resolvedType}.`
          : `Missing type, inferred automatically as: ${resolvedType}.`,
      });
    }

    const frontText = asTrimmedString(row.raw.front_text);
    const backText = asTrimmedString(row.raw.back_text);
    const explanationText = asTrimmedString(row.raw.explanation);
    const frontImageName = asTrimmedString(row.raw.front_image) || null;
    const backImageName = asTrimmedString(row.raw.back_image) || null;
    const hasAnyFrontContent =
      frontText.length > 0 || Boolean(frontImageName) || Boolean(backImageName);

    if (!hasAnyFrontContent) {
      rowIssues.push({
        row: row.rowNumber,
        field: "front_text",
        severity: "error",
        code: "missing_front_text",
        message: isPolish
          ? "Ten wiersz nie ma ani awersu, ani obrazka, więc karta nie może powstać."
          : "This row has neither front text nor image, so the card cannot be created.",
      });
    }

    if (resolvedType === "true_false" && !hasTfAnswer) {
      rowIssues.push({
        row: row.rowNumber,
        field: "tf_answer",
        severity: "error",
        code: "missing_tf_answer",
        message: isPolish
          ? `Dla typu true_false kolumna ${getCsvFieldLabel("tf_answer", locale)} jest wymagana.`
          : `For type=true_false, column ${getCsvFieldLabel("tf_answer", locale)} is required.`,
      });
    }

    if (input.source === "zip" && input.hasZipImage) {
      for (const field of [
        { value: frontImageName, key: "front_image" as const },
        { value: backImageName, key: "back_image" as const },
      ]) {
        if (field.value && !input.hasZipImage(field.value)) {
          missingImageCount += 1;
          rowIssues.push({
            row: row.rowNumber,
            field: field.key,
            severity: "warning",
            code: "missing_image",
            message: isPolish
              ? `Nie znaleziono obrazka "${field.value}" w ZIP (folder images/).`
              : `Image "${field.value}" not found in ZIP (images/ folder).`,
          });
        }
      }
    }
    if (input.source === "csv" || input.source === "txt") {
      for (const field of [
        { value: frontImageName, key: "front_image" as const },
        { value: backImageName, key: "back_image" as const },
      ]) {
        if (
          field.value &&
          !field.value.startsWith("file://") &&
          !field.value.startsWith("content://")
        ) {
          rowIssues.push({
            row: row.rowNumber,
            field: field.key,
            severity: "warning",
            code: "unsupported_image_reference",
            message: isPolish
              ? "Dla zwykłego CSV/TXT obrazki muszą mieć ścieżkę file:// lub content://. Alternatywnie użyj ZIP z folderem images/."
              : "For plain CSV/TXT, images must use file:// or content:// path. Alternatively use ZIP with images/ folder.",
          });
        }
      }
    }

    issues.push(...rowIssues);

    const hasBlockingError = rowIssues.some((item) => item.severity === "error");
    if (hasBlockingError) {
      continue;
    }

    statsByType[resolvedType] += 1;

    validRows.push({
      rowNumber: row.rowNumber,
      type: resolvedType,
      mappedType: mapCsvTypeToManualType(resolvedType),
      typeInferred,
      frontText,
      backText,
      tfAnswer: hasTfAnswer ? parseBooleanValue(row.raw.tf_answer) : null,
      flip: parseBooleanValue(row.raw.flip),
      explanation: explanationText || null,
      frontImageName,
      backImageName,
    });
  }

  return {
    source: input.source,
    fileName: input.fileName,
    totalRows: input.rows.length,
    validRows,
    invalidRowsCount: input.rows.length - validRows.length,
    issues,
    statsByType,
    inferredTypeCount,
    missingImageCount,
    resolveImage: input.resolveImage,
  };
};
