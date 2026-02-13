import type { ManualCardType } from "@/src/hooks/useManualCardsForm";

export type CsvCardType = "traditional" | "true_false" | "self_assess";

export type CsvIssueSeverity = "error" | "warning";

export type CsvIssueCode =
  | "parse_error"
  | "missing_csv_in_zip"
  | "missing_front_text"
  | "invalid_type"
  | "missing_tf_answer"
  | "inferred_type"
  | "unknown_header"
  | "missing_image"
  | "unsupported_image_reference";

export type CsvIssue = {
  row: number | null;
  field: string | null;
  severity: CsvIssueSeverity;
  code: CsvIssueCode;
  message: string;
};

export type CsvParsedRow = {
  rowNumber: number;
  raw: Record<string, unknown>;
};

export type CsvParseSource = "csv" | "zip";

export type ParsedCsvInput = {
  source: CsvParseSource;
  fileName: string;
  rows: CsvParsedRow[];
  headers: string[];
  parseIssues: CsvIssue[];
  resolveImage: (name: string | null) => Promise<string | null>;
  hasZipImage?: (name: string) => boolean;
};

export type NormalizedCsvRow = {
  rowNumber: number;
  type: CsvCardType;
  mappedType: ManualCardType;
  typeInferred: boolean;
  frontText: string;
  backText: string;
  tfAnswer: boolean | null;
  flip: boolean;
  explanation: string | null;
  frontImageName: string | null;
  backImageName: string | null;
};

export type CsvAnalysisResult = {
  source: CsvParseSource;
  fileName: string;
  totalRows: number;
  validRows: NormalizedCsvRow[];
  invalidRowsCount: number;
  issues: CsvIssue[];
  statsByType: Record<CsvCardType, number>;
  inferredTypeCount: number;
  missingImageCount: number;
  resolveImage: (name: string | null) => Promise<string | null>;
};
