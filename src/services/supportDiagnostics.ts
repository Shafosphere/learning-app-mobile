import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import {
  DEBUG_EVENTS_STORAGE_KEY,
  MAX_DEBUG_EVENTS,
} from "@/src/services/debugEvents";

type DiagnosticEntry = {
  key: string;
  label: string;
  value: string;
};

type BoxSnapshotSummary = {
  storageKey: string;
  updatedAt?: number;
  lastWriteMs?: number;
  courseId?: string;
  counts: Record<string, number>;
  cardIds: Record<string, number[]>;
  usedWordIds: number[];
};

const BOX_PREFIXES = ["boxes:", "customBoxes:"] as const;
function buildDiagnosticsFileName(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `memicard-diagnostics-${timestamp}.json`;
}

function summarizeSnapshot(
  storageKey: string,
  raw: string | null
): BoxSnapshotSummary | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const flashcards = parsed?.flashcards;
    if (!flashcards || typeof flashcards !== "object") return null;

    const counts: Record<string, number> = {};
    const cardIds: Record<string, number[]> = {};

    for (const [boxName, list] of Object.entries(flashcards)) {
      const cards = Array.isArray(list) ? list : [];
      counts[boxName] = cards.length;
      cardIds[boxName] = cards
        .map((item) => item?.id)
        .filter((id): id is number => typeof id === "number");
    }

    return {
      storageKey,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : undefined,
      lastWriteMs:
        typeof parsed.lastWriteMs === "number" ? parsed.lastWriteMs : undefined,
      courseId: typeof parsed.courseId === "string" ? parsed.courseId : undefined,
      counts,
      cardIds,
      usedWordIds: Array.isArray(parsed.usedWordIds)
        ? parsed.usedWordIds.filter((id: unknown): id is number => typeof id === "number")
        : [],
    };
  } catch {
    return null;
  }
}

async function collectBoxSnapshotSummaries(): Promise<BoxSnapshotSummary[]> {
  const keys = await AsyncStorage.getAllKeys();
  const boxKeys = keys.filter((key) =>
    BOX_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
  if (boxKeys.length === 0) return [];

  const entries = await AsyncStorage.multiGet(boxKeys);
  return entries
    .map(([key, raw]) => summarizeSnapshot(key, raw))
    .filter((summary): summary is BoxSnapshotSummary => summary != null);
}

async function collectDebugEvents(): Promise<unknown[]> {
  const raw = await AsyncStorage.getItem(DEBUG_EVENTS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_DEBUG_EVENTS) : [];
  } catch {
    return [];
  }
}

export async function createSupportDiagnosticsAttachment(
  diagnosticEntries: DiagnosticEntry[]
): Promise<string> {
  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!baseDir) {
    throw new Error("No writable directory available for diagnostics.");
  }

  const payload = {
    version: 1,
    generatedAt: Date.now(),
    diagnostics: diagnosticEntries,
    debugEvents: await collectDebugEvents(),
    boxSnapshots: await collectBoxSnapshotSummaries(),
  };

  const fileUri = `${baseDir}${buildDiagnosticsFileName()}`;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return fileUri;
}
