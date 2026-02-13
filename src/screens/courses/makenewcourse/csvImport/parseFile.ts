import { importImageFromZip, saveImage } from "@/src/services/imageService";
import * as FileSystem from "expo-file-system/legacy";
import JSZip, { JSZipObject } from "jszip";
import Papa from "papaparse";
import type { CsvIssue, CsvParsedRow, ParsedCsvInput } from "./types";

type FileAsset = {
  uri: string;
  name?: string | null;
};

type ParsedCsvRaw = {
  rows: CsvParsedRow[];
  headers: string[];
  parseIssues: CsvIssue[];
};

const normalizeRecordKeys = (input: Record<string, unknown>): Record<string, unknown> => {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    normalized[key.trim().toLowerCase()] = value;
  }
  return normalized;
};

const parseCsvText = (csvText: string): ParsedCsvRaw => {
  const normalizedCsv = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parsed = Papa.parse<Record<string, unknown>>(normalizedCsv, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = (parsed.meta.fields ?? []).map((item) => item.trim().toLowerCase());

  const rows = (parsed.data ?? []).map((raw, index) => ({
    rowNumber: index + 2,
    raw: normalizeRecordKeys(raw),
  }));

  const parseIssues: CsvIssue[] = (parsed.errors ?? []).map((error) => ({
    row:
      typeof error.row === "number" && Number.isFinite(error.row)
        ? error.row + 2
        : null,
    field: null,
    severity: "error",
    code: "parse_error",
    message: error.message,
  }));

  return { rows, headers, parseIssues };
};

const normalizeImageName = (name: string): string => name.replace(/^images[\\/]/i, "");

const buildZipImageLookup = (zip: JSZip) => {
  const map = new Map<string, JSZipObject>();
  zip.forEach((relativePath, entry) => {
    if (entry.dir) return;
    const normalized = normalizeImageName(relativePath).toLowerCase();
    if (!normalized) return;
    if (!map.has(normalized)) {
      map.set(normalized, entry);
    }
  });
  return map;
};

const findCsvInZip = (zip: JSZip): JSZipObject | null => {
  const dataCsv = zip.file("data.csv");
  if (dataCsv) return dataCsv;
  const anyCsv = zip.file(/\.csv$/i)?.[0];
  return anyCsv ?? null;
};

export const parseImportFile = async (asset: FileAsset): Promise<ParsedCsvInput> => {
  const fileName = (asset.name ?? "").trim() || "plik";
  const isZip = fileName.toLowerCase().endsWith(".zip");

  if (!isZip) {
    const csvText = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const parsed = parseCsvText(csvText);
    const imageCache = new Map<string, string | null>();

    const resolveImage = async (name: string | null): Promise<string | null> => {
      if (!name) return null;
      if (imageCache.has(name)) {
        return imageCache.get(name) ?? null;
      }
      if (name.startsWith("file://") || name.startsWith("content://")) {
        try {
          const saved = await saveImage(name);
          imageCache.set(name, saved);
          return saved;
        } catch {
          imageCache.set(name, null);
          return null;
        }
      }
      imageCache.set(name, null);
      return null;
    };

    return {
      source: "csv",
      fileName,
      rows: parsed.rows,
      headers: parsed.headers,
      parseIssues: parsed.parseIssues,
      resolveImage,
    };
  }

  const zipBase64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const zip = await JSZip.loadAsync(zipBase64, { base64: true });

  const csvEntry = findCsvInZip(zip);
  if (!csvEntry) {
    return {
      source: "zip",
      fileName,
      rows: [],
      headers: [],
      parseIssues: [
        {
          row: null,
          field: null,
          severity: "error",
          code: "missing_csv_in_zip",
          message: "Brak pliku CSV w archiwum ZIP.",
        },
      ],
      resolveImage: async () => null,
      hasZipImage: () => false,
    };
  }

  const csvText = await csvEntry.async("string");
  const parsed = parseCsvText(csvText);
  const zipImageLookup = buildZipImageLookup(zip);
  const imageCache = new Map<string, string | null>();

  const resolveImage = async (name: string | null): Promise<string | null> => {
    if (!name) return null;
    if (imageCache.has(name)) return imageCache.get(name) ?? null;

    const normalized = normalizeImageName(name).toLowerCase();
    const entry = zipImageLookup.get(normalized);
    if (!entry) {
      imageCache.set(name, null);
      return null;
    }

    try {
      const base64 = await entry.async("base64");
      const saved = await importImageFromZip(base64, normalizeImageName(name));
      imageCache.set(name, saved);
      return saved;
    } catch {
      imageCache.set(name, null);
      return null;
    }
  };

  const hasZipImage = (name: string): boolean => {
    const normalized = normalizeImageName(name).toLowerCase();
    return zipImageLookup.has(normalized);
  };

  return {
    source: "zip",
    fileName,
    rows: parsed.rows,
    headers: parsed.headers,
    parseIssues: parsed.parseIssues,
    resolveImage,
    hasZipImage,
  };
};
