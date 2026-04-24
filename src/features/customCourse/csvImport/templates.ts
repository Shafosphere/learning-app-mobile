export type CsvTemplateKey =
  | "traditional"
  | "true_false"
  | "self_assess"
  | "mixed";

type CsvTemplateLocale = "pl" | "en";

type CsvTemplateDefinition = {
  fileName: string;
  rows: string[][];
};

type CsvTemplate = {
  fileName: string;
  content: string;
};

const CSV_HEADER: Record<CsvTemplateLocale, string[]> = {
  pl: [
    "typ",
    "awers",
    "rewers",
    "obraz_awers",
    "obraz_rewers",
    "odpowiedz_tf",
    "odwroc",
    "wyjasnienie",
  ],
  en: [
    "type",
    "front_text",
    "back_text",
    "front_image",
    "back_image",
    "tf_answer",
    "flip",
    "explanation",
  ],
};

const CSV_TEMPLATE_DEFINITIONS: Record<
  CsvTemplateLocale,
  Record<CsvTemplateKey, CsvTemplateDefinition>
> = {
  pl: {
  traditional: {
    fileName: "wzor_fiszki_odpowiedz_tekstowa.csv",
    rows: [
      ["odpowiedz_tekstowa", "Stolica Polski", "Warszawa", "", "", "", "", ""],
      ["odpowiedz_tekstowa", "2 + 2", "4", "", "", "", "", ""],
    ],
  },
  true_false: {
    fileName: "wzor_fiszki_prawda_falsz.csv",
    rows: [
      ["true_false", "Slonce jest gwiazda", "", "", "", "true", "", ""],
      ["true_false", "Woda wrze w 10 C", "", "", "", "false", "", ""],
    ],
  },
  self_assess: {
    fileName: "wzor_fiszki_samoocena.csv",
    rows: [
      [
        "self_assess",
        "Wzor na pole kola",
        "",
        "",
        "",
        "",
        "",
        "Pi razy r do kwadratu",
      ],
      [
        "self_assess",
        "II zasada dynamiki Newtona",
        "",
        "",
        "",
        "",
        "",
        "F = m * a",
      ],
    ],
  },
  mixed: {
    fileName: "wzor_fiszki_mieszane.csv",
    rows: [
      ["odpowiedz_tekstowa", "Bonjour", "Hello", "", "", "", "", ""],
      ["prawda_falsz", "Ziemia jest plaska", "", "", "", "false", "", ""],
    ],
  },
  },
  en: {
    traditional: {
      fileName: "flashcards_template_text_answer.csv",
      rows: [
        ["traditional", "Capital of Poland", "Warsaw", "", "", "", "", ""],
        ["traditional", "2 + 2", "4", "", "", "", "", ""],
      ],
    },
    true_false: {
      fileName: "flashcards_template_true_false.csv",
      rows: [
        ["true_false", "The Sun is a star", "", "", "", "true", "", ""],
        ["true_false", "Water boils at 10 C", "", "", "", "false", "", ""],
      ],
    },
    self_assess: {
      fileName: "flashcards_template_self_assess.csv",
      rows: [
        [
          "self_assess",
          "Formula for area of a circle",
          "",
          "",
          "",
          "",
          "",
          "Pi times r squared",
        ],
        [
          "self_assess",
          "Newton's second law",
          "",
          "",
          "",
          "",
          "",
          "F = m * a",
        ],
      ],
    },
    mixed: {
      fileName: "flashcards_template_mixed.csv",
      rows: [
        ["traditional", "Bonjour", "Hello", "", "", "", "", ""],
        ["true_false", "Earth is flat", "", "", "", "false", "", ""],
      ],
    },
  },
};

const escapeCsvCell = (value: string): string => {
  const escaped = value.replace(/"/g, "\"\"");
  if (/[",\n]/.test(escaped)) {
    return `"${escaped}"`;
  }
  return escaped;
};

const toCsv = (rows: string[][], locale: CsvTemplateLocale): string => {
  const allRows = [CSV_HEADER[locale], ...rows];
  return `${allRows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\n")}\n`;
};

export const getCsvTemplate = (
  key: CsvTemplateKey,
  options?: { locale?: CsvTemplateLocale }
): CsvTemplate => {
  const locale = options?.locale === "pl" ? "pl" : "en";
  const definition = CSV_TEMPLATE_DEFINITIONS[locale][key];
  return {
    fileName: definition.fileName,
    content: toCsv(definition.rows, locale),
  };
};
