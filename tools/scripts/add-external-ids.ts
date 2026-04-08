// @ts-nocheck
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");
const Papa = require("papaparse");

const ROOT_DIR = path.resolve(__dirname, "../..");
const SOURCE_DIR = path.join(ROOT_DIR, "tools", "prebuild-data");

const CSV_EXTENSION = ".csv";

function detectNewline(rawText) {
  return rawText.includes("\r\n") ? "\r\n" : "\n";
}

function nextExternalId(nextNumber, width) {
  return String(nextNumber).padStart(width, "0");
}

function listCsvFiles() {
  return fs
    .readdirSync(SOURCE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(CSV_EXTENSION))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function parseCsv(csvPath) {
  const rawText = fs.readFileSync(csvPath, "utf8");
  const normalized = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parsed = Papa.parse(normalized, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors?.length) {
    const firstError = parsed.errors[0];
    throw new Error(
      `Failed to parse "${path.basename(csvPath)}": ${firstError.message}`
    );
  }

  const headers = (parsed.meta?.fields ?? []).map((field) => String(field));
  if (headers.length === 0) {
    throw new Error(`CSV "${path.basename(csvPath)}" has no headers.`);
  }

  return {
    rawText,
    newline: detectNewline(rawText),
    headers,
    rows: parsed.data,
  };
}

function collectUsedNumbers(rows) {
  const used = new Set();

  for (const row of rows) {
    const value =
      row.external_id != null ? String(row.external_id).trim() : "";
    if (!/^\d+$/.test(value)) continue;
    used.add(Number(value));
  }

  return used;
}

function assignExternalIds(fileName, rows) {
  const width = Math.max(4, String(rows.length || 1).length);
  const usedNumbers = collectUsedNumbers(rows);
  let nextNumber = 1;
  let added = 0;
  let preserved = 0;
  let normalized = 0;

  for (const row of rows) {
    const currentValue =
      row.external_id != null ? String(row.external_id).trim() : "";

    if (currentValue.length > 0) {
      const legacyMatch = currentValue.match(/:(\d+)$/);
      if (legacyMatch) {
        const numericValue = Number(legacyMatch[1]);
        if (numericValue > 0) {
          row.external_id = nextExternalId(numericValue, width);
          usedNumbers.add(numericValue);
          normalized += 1;
          continue;
        }
      }

      row.external_id = currentValue;
      preserved += 1;
      continue;
    }

    while (usedNumbers.has(nextNumber)) {
      nextNumber += 1;
    }

    row.external_id = nextExternalId(nextNumber, width);
    usedNumbers.add(nextNumber);
    nextNumber += 1;
    added += 1;
  }

  return { added, preserved, normalized };
}

function stringifyCsv(headers, rows, newline) {
  const nextHeaders = headers.includes("external_id")
    ? headers
    : ["external_id", ...headers];

  const csvText = Papa.unparse(rows, {
    columns: nextHeaders,
    newline,
  });

  return `${csvText}${newline}`;
}

function main() {
  const write = process.argv.includes("--write");
  const files = listCsvFiles();

  if (files.length === 0) {
    console.log("No CSV files found in tools/prebuild-data.");
    return;
  }

  let changedFiles = 0;
  let addedIds = 0;

  for (const fileName of files) {
    const csvPath = path.join(SOURCE_DIR, fileName);
    const parsed = parseCsv(csvPath);
    const { added, preserved, normalized } = assignExternalIds(fileName, parsed.rows);
    const output = stringifyCsv(parsed.headers, parsed.rows, parsed.newline);
    const changed = output !== parsed.rawText;

    if (changed && write) {
      fs.writeFileSync(csvPath, output, "utf8");
    }

    if (changed) {
      changedFiles += 1;
      addedIds += added;
    }

    const status = changed ? (write ? "updated" : "would update") : "unchanged";
    console.log(
      `${status}: ${fileName} added=${added} normalized=${normalized} preserved=${preserved}`
    );
  }

  console.log("");
  console.log(
    `${write ? "Finished" : "Dry run finished"}: changed_files=${changedFiles}, added_external_ids=${addedIds}`
  );

  if (!write) {
    console.log("Run with --write to save changes.");
  }
}

main();
