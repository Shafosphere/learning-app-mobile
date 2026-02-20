export type CsvTemplateKey =
  | "traditional"
  | "true_false"
  | "self_assess"
  | "mixed";

type CsvTemplateDefinition = {
  fileName: string;
  rows: string[][];
};

type CsvTemplate = {
  fileName: string;
  content: string;
};

const CSV_HEADER = [
  "type",
  "front_text",
  "back_text",
  "front_image",
  "back_image",
  "tf_answer",
  "flip",
  "explanation",
];

const CSV_TEMPLATE_DEFINITIONS: Record<CsvTemplateKey, CsvTemplateDefinition> = {
  traditional: {
    fileName: "wzor_fiszki_tradycyjne.csv",
    rows: [
      ["traditional", "Stolica Polski", "Warszawa", "", "", "", "", ""],
      ["traditional", "2 + 2", "4", "", "", "", "", ""],
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
      ["traditional", "Bonjour", "Hello", "", "", "", "", ""],
      ["true_false", "Ziemia jest plaska", "", "", "", "false", "", ""],
    ],
  },
};

const escapeCsvCell = (value: string): string => {
  const escaped = value.replace(/"/g, "\"\"");
  if (/[",\n]/.test(escaped)) {
    return `"${escaped}"`;
  }
  return escaped;
};

const toCsv = (rows: string[][]): string => {
  const allRows = [CSV_HEADER, ...rows];
  return `${allRows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\n")}\n`;
};

export const getCsvTemplate = (key: CsvTemplateKey): CsvTemplate => {
  const definition = CSV_TEMPLATE_DEFINITIONS[key];
  return {
    fileName: definition.fileName,
    content: toCsv(definition.rows),
  };
};
