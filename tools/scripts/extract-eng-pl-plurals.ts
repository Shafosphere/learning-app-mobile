import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

type CsvRow = { external_id: string; front_text: string };

const dataDir = path.resolve("tools/prebuild-data/pl");
const outputDir = path.join(dataDir, "plural");

// Reviewed English forms that have a plural-noun sense. This deliberately does
// not use a suffix-only test: e.g. `is`, `business`, and `seems` are not nouns
// in plural form, while irregular/invariant plurals such as `mice` and `deer`
// are retained. Forms such as `means` are retained when they have both a plural
// noun use and another part-of-speech use.
const pluralNounFormsByLevel: Record<string, readonly string[]> = {
  A1: [
    "people", "men", "children", "women", "others", "things", "words",
    "students", "months", "activities", "eyes", "hours", "workers", "sales",
    "teachers", "friends", "parents", "events", "animals", "items", "dollars",
    "trees", "uses", "leaders", "skills", "farmers", "tools", "grounds", "birds",
    "leaves", "flowers", "feelings", "thanks", "eggs", "legs", "teeth", "clothes",
    "scientists", "sheep", "yards", "beings", "rats", "writings", "players", "shoes",
    "lessons", "habits", "vegetables", "mice", "vols", "actors", "holdings", "guests",
    "potatoes", "knees", "neighbors", "beans", "growers", "periodicals", "foreigners",
    "musicians", "headings", "roses", "coatings", "toys", "sailors", "pants",
  ],
  A2: [
    "members", "conditions", "results", "products", "patients", "claims", "affairs",
    "arms", "details", "citizens", "fees", "acres", "variables", "customers", "soldiers",
    "consequences", "thoughts", "transactions", "specimens", "corps", "lips", "receipts",
    "tears", "kids", "visitors", "atoms", "shipments", "drawings", "makers", "meters",
    "creditors", "insects", "stairs", "bits", "dies", "appliances", "miners", "ancestors",
    "hypotheses", "shots", "stats", "metres", "ruins", "learners", "feathers", "travelers",
    "gloves",
  ],
  B1: [
    "terms", "feet", "series", "resources", "requirements", "miles", "relations", "funds",
    "cells", "standards", "regulations", "benefits", "elements", "measures", "features",
    "principles", "characteristics", "proceedings", "expenses", "techniques", "bonds", "aspects",
    "assets", "experiments", "documents", "inches", "findings", "pounds", "observations",
    "measurements", "vessels", "deposits", "criteria", "comments", "parameters", "objectives",
    "symptoms", "limitations", "compounds", "customs", "participants", "remarks", "weapons",
    "residents", "producers", "fingers", "negotiations", "pupils", "experts", "sports", "proceeds",
    "specifications", "trustees", "scholars", "researchers", "photographs", "prisoners", "molecules",
    "publishers", "inhabitants", "dividends", "defects", "mechanics", "dealers", "organisms",
    "lectures", "emotions", "critics", "fragments", "settings", "alloys", "indicators", "senses",
    "telecommunications", "politicians", "volunteers", "complications", "derivatives", "ingredients",
    "gallons", "motives", "settlers", "boots", "competitors", "obstacles", "supporters", "stamps",
    "advocates", "airlines", "accessories", "builders", "manifestations", "survivors", "graves",
    "tablets", "journalists", "dwellings", "recordings", "nails", "teachings", "accomplishments", "monks",
  ],
  B2: [
    "data", "means", "species", "employees", "provisions", "factors", "facilities", "institutions",
    "circumstances", "remains", "statistics", "tons", "components", "wages", "savings", "recommendations",
    "earnings", "manufacturers", "imports", "troops", "particles", "obligations", "implications", "jews",
    "restrictions", "dimensions", "guidelines", "premises", "headquarters", "veterans", "candidates", "disorders",
    "colleagues", "expectations", "fisheries", "illustrations", "constraints", "tribes", "investors",
    "qualifications", "prospects", "archives", "lesions", "delegates", "allies", "doses", "shareholders",
    "voters", "immigrants", "deer", "norms", "refugees", "practitioners", "providers", "constituents",
    "investigators", "bass", "traits", "suppliers", "followers", "peasants", "bankers", "allegations",
    "subsidies", "brooks", "sanctions", "democrats", "heirs", "nuts", "glands", "educators", "opponents",
    "traders", "offenders", "quotations", "disciples", "surroundings", "concessions", "laborers", "economists",
    "adolescents", "axes", "descendants", "distributors", "odds", "inmates", "aspirations", "ounces", "ribs",
    "retailers", "tonnes",
  ],
};

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function readRows(filePath: string): CsvRow[] {
  const text = fs.readFileSync(filePath, "utf8");
  const parsed = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    throw new Error(`${filePath}: invalid CSV: ${parsed.errors[0].message}`);
  }
  return parsed.data;
}

function exportLevel(level: string): void {
  const sourcePath = path.join(dataDir, `ENGtoPL_${level}.csv`);
  const sourceText = fs.readFileSync(sourcePath, "utf8");
  const rows = readRows(sourcePath);
  const pluralForms = new Set(pluralNounFormsByLevel[level].map(normalize));
  const selectedIds = new Set(
    rows
      .filter((row) => pluralForms.has(normalize(row.front_text)))
      .map((row) => row.external_id),
  );

  const matchedForms = new Set(
    rows
      .filter((row) => selectedIds.has(row.external_id))
      .map((row) => normalize(row.front_text)),
  );
  const missingForms = [...pluralForms].filter((form) => !matchedForms.has(form));
  if (missingForms.length > 0) {
    throw new Error(`${level}: reviewed forms missing from source: ${missingForms.join(", ")}`);
  }

  // Source files have one CSV record per physical line. Keep those raw lines so
  // every selected row, including its Polish quoting, is byte-for-byte unchanged.
  const rawLines = sourceText.split(/(?<=\n)/);
  const selectedLines = rawLines.filter((line, index) => {
    if (index === 0) return true;
    const parsed = Papa.parse<string[]>(line, { skipEmptyLines: true });
    return parsed.data.length > 0 && selectedIds.has(String(parsed.data[0][0] ?? ""));
  });
  const output = selectedLines.join("");
  const outputRows = Papa.parse<CsvRow>(output, { header: true, skipEmptyLines: true });
  if (outputRows.errors.length > 0 || outputRows.data.length !== selectedIds.size) {
    throw new Error(`${level}: output CSV validation failed`);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, `ENGtoPL_${level}.csv`), output, "utf8");
  console.log(`${level}: ${outputRows.data.length} plural-noun rows`);
}

function rawRowsById(csvText: string): Map<string, string> {
  const rawRows = new Map<string, string>();
  for (const [index, line] of csvText.split(/(?<=\n)/).entries()) {
    if (index === 0 || line.trim() === "") continue;
    const parsed = Papa.parse<string[]>(line, { skipEmptyLines: true });
    if (parsed.errors.length > 0 || parsed.data.length !== 1) {
      throw new Error("CSV must contain exactly one record per physical line");
    }
    const id = String(parsed.data[0][0] ?? "");
    if (rawRows.has(id)) throw new Error(`duplicate external_id: ${id}`);
    rawRows.set(id, line);
  }
  return rawRows;
}

function applyPluralEditsToSource(level: string): void {
  const sourcePath = path.join(dataDir, `ENGtoPL_${level}.csv`);
  const pluralPath = path.join(outputDir, `ENGtoPL_${level}.csv`);
  const sourceText = fs.readFileSync(sourcePath, "utf8");
  const pluralText = fs.readFileSync(pluralPath, "utf8");
  const sourceRows = readRows(sourcePath);
  const pluralRows = readRows(pluralPath);
  const sourceIds = new Set(sourceRows.map((row) => row.external_id));
  const missingIds = pluralRows
    .map((row) => row.external_id)
    .filter((id) => !sourceIds.has(id));
  if (missingIds.length > 0) {
    throw new Error(`${level}: plural rows missing from source: ${missingIds.join(", ")}`);
  }

  const editedRawRows = rawRowsById(pluralText);
  const mergedText = sourceText
    .split(/(?<=\n)/)
    .map((line, index) => {
      if (index === 0 || line.trim() === "") return line;
      const id = String(Papa.parse<string[]>(line, { skipEmptyLines: true }).data[0][0] ?? "");
      const editedLine = editedRawRows.get(id);
      if (!editedLine) return line;

      // An editor may remove the final newline from the plural export. Retain
      // source record boundaries while copying the edited CSV record content.
      const sourceLineEnding = line.match(/\r?\n$/)?.[0] ?? "";
      return editedLine.replace(/\r?\n$/, "") + sourceLineEnding;
    })
    .join("");

  const mergedRows = Papa.parse<CsvRow>(mergedText, { header: true, skipEmptyLines: true });
  if (mergedRows.errors.length > 0 || mergedRows.data.length !== sourceRows.length) {
    throw new Error(`${level}: merged CSV validation failed`);
  }
  const mergedById = new Map(mergedRows.data.map((row) => [row.external_id, row]));
  for (const editedRow of pluralRows) {
    if (JSON.stringify(mergedById.get(editedRow.external_id)) !== JSON.stringify(editedRow)) {
      throw new Error(`${level}: edited row ${editedRow.external_id} was not merged`);
    }
  }

  fs.writeFileSync(sourcePath, mergedText, "utf8");
  console.log(`${level}: merged ${pluralRows.length} plural-folder rows into source`);
}

const levels = ["A1", "A2", "B1", "B2"];
if (process.argv.includes("--apply-back")) {
  for (const level of levels) applyPluralEditsToSource(level);
} else {
  for (const level of levels) exportLevel(level);
}
