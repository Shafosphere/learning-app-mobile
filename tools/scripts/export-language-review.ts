// @ts-nocheck
/* eslint-disable @typescript-eslint/no-require-imports */

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const ExcelJS = require("exceljs");
const Papa = require("papaparse");

const ROOT_DIR = path.resolve(__dirname, "../..");
const OUTPUT_DIR = path.join(ROOT_DIR, "language-review");
const STATUS_OPTIONS = [
  "Do sprawdzenia",
  "Bez zmian",
  "Do poprawy",
  "Pytanie",
  "Zatwierdzone",
];
const HEADERS = [
  "ID",
  "Sekcja",
  "Kontekst",
  "Typ tekstu",
  "Klucz JSON",
  "Obecny tekst",
  "Proponowany tekst",
  "Uwagi",
  "Status",
  "Chronione elementy",
  "Poprzedni tekst",
  "Następny tekst",
];
const EDITABLE_COLUMNS = new Set(["Proponowany tekst", "Uwagi", "Status"]);

const SECTION_NAMES = {
  quotes: "Cytaty i reakcje",
  app: "Aplikacja",
  localExportReminder: "Przypomnienie o eksporcie",
  notifications: "Powiadomienia",
  settings: "Ustawienia",
  support: "Pomoc i wsparcie",
  legal: "Teksty prawne",
  onboarding: "Samouczek",
  flashcards: "Fiszki",
  courses: "Kursy",
  components: "Komponenty",
  constants: "Stałe",
  contexts: "Konteksty",
  courseCreator: "Tworzenie kursu",
  features: "Funkcje",
  services: "Usługi",
  screens: "Ekrany",
  repeats: "Powtórki",
};

const CONTEXT_BY_KEY = {
  title: "Tytuł elementu",
  subtitle: "Opis pod elementem",
  description: "Opis",
  button: "Tekst przycisku",
  error: "Komunikat błędu",
  confirm: "Przycisk potwierdzenia",
};

function toJsonPath(parts) {
  return parts.reduce((result, part) => {
    if (/^\[\d+\]$/.test(part)) return `${result}${part}`;
    return result ? `${result}.${part}` : part;
  }, "");
}

function collectStrings(value, parts = [], result = []) {
  if (typeof value === "string") {
    result.push({ path: toJsonPath(parts), value });
    return result;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStrings(item, [...parts, `[${index}]`], result));
    return result;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => collectStrings(item, [...parts, key], result));
  }
  return result;
}

function stableId(jsonPath) {
  return `pl-${crypto.createHash("sha256").update(jsonPath).digest("hex").slice(0, 16)}`;
}

function humanize(value) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function contextLabelFor(jsonPath) {
  const key = jsonPath.split(".").at(-1).replace(/\[\d+\]$/, "");
  return CONTEXT_BY_KEY[key] ?? `Tekst: ${humanize(key)}`;
}

function locationFor(jsonPath, labelsByObjectPath) {
  const parts = jsonPath.split(".");
  const topLevelKey = parts[0];
  const location = [SECTION_NAMES[topLevelKey] ?? humanize(topLevelKey)];

  for (let index = 1; index < parts.length - 1; index += 1) {
    const objectPath = parts.slice(0, index + 1).join(".");
    const label = labelsByObjectPath.get(objectPath) ?? humanize(parts[index].replace(/\[\d+\]$/, ""));
    if (label && location.at(-1) !== label) location.push(label);
  }

  return location.join(" → ");
}

function typeFor(jsonPath) {
  if (/\.(step\d+)(\.|$)/i.test(jsonPath)) return "Samouczek";
  if (/^(quotes\.reactions|repeats\.)/i.test(jsonPath)) return "Reakcja lub cytat";
  if (/^legal\./i.test(jsonPath)) return "Tekst prawny";
  if (/(debug|diagnostic|developer|devTools|test)/i.test(jsonPath)) return "Tekst deweloperski";
  if (/(error|errors|warning|fail|invalid|empty|missing|permission|denied|unsupported|limit|alert)/i.test(jsonPath)) {
    return "Komunikat lub błąd";
  }
  return "Tekst interfejsu";
}

function protectedElements(value) {
  const found = [];
  const addMatches = (regex) => {
    for (const match of value.matchAll(regex)) found.push(match[0]);
  };

  addMatches(/\{\{[^{}]+\}\}/g);
  if (value.includes("\n") || value.includes("\r")) found.push("\\n");
  addMatches(/https?:\/\/[^\s<>"']+/g);
  addMatches(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g);
  return [...new Set(found)].join("\n");
}

function tutorialNeighbours(jsonPath, valuesByPath) {
  const match = jsonPath.match(/^(.*)\.step(\d+)\.([^.]+)$/i);
  if (!match) return { previous: "", next: "" };
  const [, prefix, stepNumber, leaf] = match;
  const number = Number(stepNumber);
  return {
    previous: valuesByPath.get(`${prefix}.step${number - 1}.${leaf}`) ?? "",
    next: valuesByPath.get(`${prefix}.step${number + 1}.${leaf}`) ?? "",
  };
}

function buildRows(json) {
  const strings = collectStrings(json);
  const valuesByPath = new Map(strings.map((item) => [item.path, item.value]));
  const labelsByObjectPath = new Map();
  strings.forEach(({ path: jsonPath, value }) => {
    const match = jsonPath.match(/^(.*)\.(title|section|name)$/i);
    if (match && value.trim()) labelsByObjectPath.set(match[1], value);
  });
  return strings.map(({ path: jsonPath, value }) => {
    const neighbours = tutorialNeighbours(jsonPath, valuesByPath);
    const topLevelKey = jsonPath.split(".")[0];
    return {
      "ID": stableId(jsonPath),
      "Sekcja": SECTION_NAMES[topLevelKey] ?? humanize(topLevelKey),
      "Kontekst": `${locationFor(jsonPath, labelsByObjectPath)} — ${contextLabelFor(jsonPath)}`,
      "Typ tekstu": typeFor(jsonPath),
      "Klucz JSON": jsonPath,
      "Obecny tekst": value,
      "Proponowany tekst": "",
      "Uwagi": "",
      "Status": "Do sprawdzenia",
      "Chronione elementy": protectedElements(value),
      "Poprzedni tekst": neighbours.previous,
      "Następny tekst": neighbours.next,
    };
  });
}

function rowsForSheet(rows, type) {
  return type ? rows.filter((row) => row["Typ tekstu"] === type) : rows;
}

function addDataSheet(workbook, name, rows) {
  const worksheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  worksheet.columns = [
    { header: "ID", key: "ID", width: 24 },
    { header: "Sekcja", key: "Sekcja", width: 24 },
    { header: "Kontekst", key: "Kontekst", width: 28 },
    { header: "Typ tekstu", key: "Typ tekstu", width: 24 },
    { header: "Klucz JSON", key: "Klucz JSON", width: 52 },
    { header: "Obecny tekst", key: "Obecny tekst", width: 55 },
    { header: "Proponowany tekst", key: "Proponowany tekst", width: 55 },
    { header: "Uwagi", key: "Uwagi", width: 36 },
    { header: "Status", key: "Status", width: 18 },
    { header: "Chronione elementy", key: "Chronione elementy", width: 30 },
    { header: "Poprzedni tekst", key: "Poprzedni tekst", width: 45 },
    { header: "Następny tekst", key: "Następny tekst", width: 45 },
  ];
  worksheet.addRows(rows);
  worksheet.autoFilter = { from: "A1", to: "L1" };

  const header = worksheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
  header.alignment = { vertical: "middle", wrapText: true };
  header.height = 28;

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.alignment = { vertical: "top", wrapText: true };
    row.eachCell((cell) => {
      const editable = EDITABLE_COLUMNS.has(worksheet.getColumn(cell.col).key);
      cell.protection = { locked: !editable };
      if (editable) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
      }
    });
  });
  if (rows.length > 0) {
    worksheet.getColumn("Status").eachCell((cell, rowNumber) => {
      if (rowNumber > 1) {
        cell.dataValidation = {
          type: "list",
          allowBlank: false,
          formulae: [`"${STATUS_OPTIONS.join(",")}"`],
        };
      }
    });
  }
  worksheet.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    autoFilter: true,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    deleteColumns: false,
    deleteRows: false,
    sort: true,
  });
}

function addInstructionsSheet(workbook) {
  const sheet = workbook.addWorksheet("Instrukcja");
  sheet.columns = [{ width: 100 }];
  const lines = [
    "Instrukcja korekty językowej",
    "Nie zmieniaj kolumny Obecny tekst.",
    "Poprawioną pełną wersję wpisuj w Proponowany tekst.",
    "Nie zmieniaj ID ani Klucz JSON.",
    "Nie usuwaj elementów z kolumny Chronione elementy.",
    "Ustaw odpowiedni status po sprawdzeniu tekstu.",
    "",
    "Edycja jest odblokowana głównie w kolumnach: Proponowany tekst, Uwagi i Status.",
  ];
  lines.forEach((line, index) => {
    const cell = sheet.getCell(index + 1, 1);
    cell.value = line;
    cell.alignment = { wrapText: true, vertical: "top" };
    if (index === 0) cell.font = { bold: true, size: 14 };
  });
  sheet.getRow(1).height = 24;
  sheet.protect("", { selectLockedCells: true, selectUnlockedCells: true });
}

async function writeXlsx(rows, targetPath) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Memicard";
  workbook.created = new Date();
  addDataSheet(workbook, "Wszystkie teksty", rows);
  addDataSheet(workbook, "Samouczek", rowsForSheet(rows, "Samouczek"));
  addDataSheet(workbook, "Komunikaty i błędy", rowsForSheet(rows, "Komunikat lub błąd"));
  addDataSheet(workbook, "Reakcje i cytaty", rowsForSheet(rows, "Reakcja lub cytat"));
  addDataSheet(workbook, "Teksty prawne", rowsForSheet(rows, "Tekst prawny"));
  addDataSheet(workbook, "Teksty deweloperskie", rowsForSheet(rows, "Tekst deweloperski"));
  addInstructionsSheet(workbook);
  await workbook.xlsx.writeFile(targetPath);
}

function writeCsv(rows, targetPath) {
  const csv = Papa.unparse(rows, { columns: HEADERS, delimiter: ";", newline: "\r\n" });
  fs.writeFileSync(targetPath, `\uFEFF${csv}\r\n`, "utf8");
}

function writeReadme(targetPath) {
  const content = `# Korekta językowa\n\n1. Nie zmieniaj kolumny **Obecny tekst**.\n2. Poprawioną pełną wersję wpisuj w **Proponowany tekst**.\n3. Nie zmieniaj **ID** ani **Klucz JSON**.\n4. Nie usuwaj elementów z kolumny **Chronione elementy**.\n5. Ustaw odpowiedni **Status** po sprawdzeniu tekstu.\n\n## Ponowne wygenerowanie\n\nZ katalogu głównego projektu uruchom:\n\n\`\`\`bash\nnpm run language:export -- ./src/locales/pl.json\n\`\`\`\n\nPolecenie nadpisuje pliki w \`language-review/\` i nie modyfikuje źródłowego JSON-a.\n`;
  fs.writeFileSync(targetPath, content, "utf8");
}

async function main() {
  const sourceArgument = process.argv[2];
  if (!sourceArgument) {
    throw new Error("Użycie: npm run language:export -- ./ścieżka/pl.json");
  }
  const sourcePath = path.resolve(process.cwd(), sourceArgument);
  const sourceText = fs.readFileSync(sourcePath, "utf8");
  const json = JSON.parse(sourceText);
  const rows = buildRows(json);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  writeCsv(rows, path.join(OUTPUT_DIR, "pl-language-review.csv"));
  writeReadme(path.join(OUTPUT_DIR, "README.md"));
  await writeXlsx(rows, path.join(OUTPUT_DIR, "pl-language-review.xlsx"));
  console.log(`Wyeksportowano ${rows.length} tekstów do ${path.relative(ROOT_DIR, OUTPUT_DIR)}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
