import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, type AppStateStatus } from "react-native";
// Adjust import path to your project
import { BoxesState, WordWithTranslations } from "@/src/types/boxes";

// ---- Public helpers --------------------------------------------------------
export type BoxName = keyof BoxesState;
export const boxOrder: BoxName[] = [
  "boxZero",
  "boxOne",
  "boxTwo",
  "boxThree",
  "boxFour",
  "boxFive",
];

export function makeCourseKey(course: {
  sourceLangId?: number | null;
  targetLangId?: number | null;
  sourceLang?: string | null; // e.g. "EN"
  targetLang?: string | null; // e.g. "PL"
}) {
  const byId =
    course.sourceLangId != null && course.targetLangId != null
      ? `${course.sourceLangId}-${course.targetLangId}`
      : null;
  const byCode =
    course.sourceLang && course.targetLang
      ? `${course.sourceLang}-${course.targetLang}`
      : null;
  return byId ?? byCode ?? "unknown-course";
}

export type SavedBoxesV2 = {
  v: 2;
  updatedAt: number; // epoch ms
  courseId: string; // e.g. "1-2-A1"
  sourceLangId: number;
  targetLangId: number;
  level: string; // "A1" | ... | "C2"
  batchIndex: number;
  flashcards: BoxesState; // full snapshot of boxes state
  usedWordIds?: number[]; // ids already used in session/history
  lastWriteMs?: number;
  payloadBytes?: number;
};

export function makeScopeId(
  sourceLangId: number,
  targetLangId: number,
  level: string
) {
  return `${sourceLangId}-${targetLangId}-${level}`;
}

// Helper: remove a single wordId from usedWordIds inside saved snapshot
export async function removeWordIdFromUsedWordIds(params: {
  sourceLangId: number;
  targetLangId: number;
  level: string; // CEFR
  wordId: number;
  storageNamespace?: string; // defaults to 'boxes'
}): Promise<void> {
  const { sourceLangId, targetLangId, level, wordId, storageNamespace = "boxes" } = params;
  const storageKey = `${storageNamespace}:${makeScopeId(sourceLangId, targetLangId, level)}`;
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as SavedBoxesV2;
    if (!parsed || parsed.v !== 2) return;
    const current = Array.isArray(parsed.usedWordIds) ? parsed.usedWordIds : [];
    const next = current.filter((id) => id !== wordId);
    const updated: SavedBoxesV2 = {
      ...parsed,
      updatedAt: Date.now(),
      usedWordIds: next,
    };
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
  } catch (err) {
      console.warn("[removeWordIdFromUsedWordIds] Parse or write error", { err, storageKey });
  }
}

async function loadFromStorageSnapshot(
  key: string
): Promise<{ parsed: SavedBoxesV2; raw: string } | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!parsed || parsed.v !== 2) return null;
  return { parsed: parsed as SavedBoxesV2, raw };
}

type PersistMeta = { ts: number; bytes: number; durationMs: number };
type PersistWrite = { key: string; serialized: string };

function estimatePayloadBytes(serialized: string): number {
  if (typeof TextEncoder !== "undefined") {
    try {
      return new TextEncoder().encode(serialized).length;
    } catch {
      // Fall back to UTF-16 length approximation below.
    }
  }
  return serialized.length;
}

const createEmptyBoxes = (): BoxesState => ({
  boxZero: [],
  boxOne: [],
  boxTwo: [],
  boxThree: [],
  boxFour: [],
  boxFive: [],
});

const normalizeBoxes = (source?: BoxesState | null): BoxesState => {
  const empty = createEmptyBoxes();
  if (!source) {
    return empty;
  }

  return {
    boxZero: source.boxZero ?? [],
    boxOne: source.boxOne ?? [],
    boxTwo: source.boxTwo ?? [],
    boxThree: source.boxThree ?? [],
    boxFour: source.boxFour ?? [],
    boxFive: source.boxFive ?? [],
  };
};

export function useBoxesPersistenceSnapshot(params: {
  sourceLangId: number;
  targetLangId: number;
  level: string;
  storageNamespace?: string;
  initialWords?: WordWithTranslations[];
  autosave?: boolean;
  saveDelayMs?: number;
  flushOnAppStateChange?: boolean;
  skipUnchangedWrites?: boolean;
}) {
  const {
    sourceLangId,
    targetLangId,
    level,
    storageNamespace = "boxes",
    initialWords,
    autosave = true,
    saveDelayMs = 1000,
    flushOnAppStateChange = true,
    skipUnchangedWrites = true,
  } = params;

  const storageKey = `${storageNamespace}:${makeScopeId(
    sourceLangId,
    targetLangId,
    level
  )}`;

  const [boxes, setBoxes] = useState<BoxesState>(() => createEmptyBoxes());
  const [batchIndex, setBatchIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [usedWordIds, setUsedWordIds] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [totalWordsForLevel] = useState<number>(0);
  const savingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRestoringRef = useRef(true);
  const boxesRef = useRef<BoxesState>(boxes);
  const usedWordIdsRef = useRef<number[]>(usedWordIds);
  const batchIndexRef = useRef<number>(batchIndex);
  const isReadyRef = useRef(false);
  const writeInFlightRef = useRef(false);
  const pendingWriteRef = useRef<PersistWrite | null>(null);
  const idleResolversRef = useRef<(() => void)[]>([]);
  const lastSerializedRef = useRef<string | null>(null);
  const lastPersistMetaRef = useRef<PersistMeta | null>(null);

  const clearSavingTimer = useCallback(() => {
    if (!savingTimer.current) return;
    clearTimeout(savingTimer.current);
    savingTimer.current = null;
  }, []);

  const resolveIdleWaiters = useCallback(() => {
    if (writeInFlightRef.current || pendingWriteRef.current) return;
    const resolvers = idleResolversRef.current;
    idleResolversRef.current = [];
    resolvers.forEach((resolve) => resolve());
  }, []);

  const waitForWriteIdle = useCallback(() => {
    if (!writeInFlightRef.current && !pendingWriteRef.current) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      idleResolversRef.current.push(resolve);
    });
  }, []);

  const runPersistQueue = useCallback(async () => {
    if (writeInFlightRef.current) return;
    writeInFlightRef.current = true;

    try {
      // Consume only latest payload (pendingWriteRef is replaced by enqueue).
      for (;;) {
        const current = pendingWriteRef.current;
        if (!current) break;
        pendingWriteRef.current = null;

        if (
          skipUnchangedWrites &&
          current.serialized === lastSerializedRef.current
        ) {
          continue;
        }

        const startedAt = Date.now();
        await AsyncStorage.setItem(current.key, current.serialized);
        const durationMs = Date.now() - startedAt;
        const bytes = estimatePayloadBytes(current.serialized);
        lastSerializedRef.current = current.serialized;
        lastPersistMetaRef.current = {
          ts: Date.now(),
          bytes,
          durationMs,
        };
      }
    } finally {
      writeInFlightRef.current = false;
      if (pendingWriteRef.current) {
        void runPersistQueue();
        return;
      }
      resolveIdleWaiters();
    }
  }, [resolveIdleWaiters, skipUnchangedWrites]);

  const enqueuePersist = useCallback(
    async (write: PersistWrite, awaitIdle: boolean) => {
      pendingWriteRef.current = write;
      void runPersistQueue();
      if (awaitIdle) {
        await waitForWriteIdle();
      }
    },
    [runPersistQueue, waitForWriteIdle]
  );

  const buildSerializedSnapshot = useCallback((): PersistWrite => {
    const payload: SavedBoxesV2 = {
      v: 2,
      updatedAt: Date.now(),
      courseId: makeScopeId(sourceLangId, targetLangId, level),
      sourceLangId,
      targetLangId,
      level,
      batchIndex: batchIndexRef.current,
      flashcards: boxesRef.current,
      usedWordIds: usedWordIdsRef.current,
      lastWriteMs: Date.now(),
    };

    return {
      key: storageKey,
      serialized: JSON.stringify(payload),
    };
  }, [level, sourceLangId, storageKey, targetLangId]);

  useEffect(() => {
    boxesRef.current = boxes;
  }, [boxes]);

  useEffect(() => {
    usedWordIdsRef.current = usedWordIds;
  }, [usedWordIds]);

  useEffect(() => {
    batchIndexRef.current = batchIndex;
  }, [batchIndex]);

  useEffect(() => {
    isReadyRef.current = isReady;
  }, [isReady]);

  useEffect(() => {
    let mounted = true;
    isRestoringRef.current = true;
    setIsReady(false);
    clearSavingTimer();
    (async () => {
      try {
        const saved = await loadFromStorageSnapshot(storageKey);
        if (saved) {
          if (mounted) {
            lastSerializedRef.current = saved.raw;
            setBoxes(normalizeBoxes(saved.parsed.flashcards));
            setBatchIndex(saved.parsed.batchIndex ?? 0);
            setUsedWordIds(saved.parsed.usedWordIds ?? []);
          }
        } else if (initialWords && mounted) {
          lastSerializedRef.current = null;
          setBoxes({
            ...createEmptyBoxes(),
            boxOne: initialWords,
          });
          setBatchIndex(0);
          setUsedWordIds(initialWords.map((w) => w.id));
        } else if (mounted) {
          lastSerializedRef.current = null;
          setBoxes(createEmptyBoxes());
          setBatchIndex(0);
          setUsedWordIds([]);
        }
      } finally {
        isRestoringRef.current = false;
        setIsReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [clearSavingTimer, storageKey, initialWords]);

  // Recompute progress whenever usedWordIds or total changes
  useEffect(() => {
    if (totalWordsForLevel > 0) {
      setProgress(Math.min(1, usedWordIds.length / totalWordsForLevel));
    } else {
      setProgress(0);
    }
  }, [usedWordIds, totalWordsForLevel]);

  // Autosave when boxes change
  useEffect(() => {
    if (!autosave || !isReady) return;
    if (isRestoringRef.current) return; // avoid saving right after load

    clearSavingTimer();
    savingTimer.current = setTimeout(() => {
      const write = buildSerializedSnapshot();
      void enqueuePersist(write, false);
    }, saveDelayMs);
  }, [
    autosave,
    batchIndex,
    boxes,
    buildSerializedSnapshot,
    clearSavingTimer,
    enqueuePersist,
    isReady,
    level,
    saveDelayMs,
    sourceLangId,
    targetLangId,
    usedWordIds,
  ]);

  const resetSave = useCallback(async () => {
    clearSavingTimer();
    pendingWriteRef.current = null;
    lastSerializedRef.current = null;
    lastPersistMetaRef.current = null;
    await AsyncStorage.removeItem(storageKey);
  }, [clearSavingTimer, storageKey]);

  const flushNow = useCallback(async () => {
    clearSavingTimer();
    if (!isReadyRef.current || isRestoringRef.current) return;
    const write = buildSerializedSnapshot();
    await enqueuePersist(write, true);
  }, [buildSerializedSnapshot, clearSavingTimer, enqueuePersist]);

  useEffect(() => {
    if (!flushOnAppStateChange) return;
    const onAppStateChange = (state: AppStateStatus) => {
      if (state === "inactive" || state === "background") {
        void flushNow();
      }
    };
    const sub = AppState.addEventListener("change", onAppStateChange);
    return () => {
      sub.remove();
    };
  }, [flushNow, flushOnAppStateChange]);

  const saveNow = useCallback(async () => {
    await flushNow();
  }, [flushNow]);

  const getLastPersistMeta = useCallback(() => {
    return lastPersistMetaRef.current;
  }, []);

  useEffect(() => {
    return () => {
      clearSavingTimer();
      void flushNow();
    };
  }, [clearSavingTimer, flushNow]);

  useEffect(() => {
    return () => {
      void flushNow();
    };
  }, [storageKey, flushNow]);

  const addUsedWordIds = useCallback((ids: number[] | number) => {
    const list = Array.isArray(ids) ? ids : [ids];
    setUsedWordIds((prev) => {
      if (list.length === 0) return prev;
      const set = new Set(prev);
      for (const id of list) set.add(id);
      return Array.from(set);
    });
  }, []);

  const removeUsedWordIds = useCallback((ids: number[] | number) => {
    const list = Array.isArray(ids) ? ids : [ids];
    if (list.length === 0) return;
    setUsedWordIds((prev) => prev.filter((id) => !list.includes(id)));
  }, []);

  return {
    boxes,
    setBoxes,
    batchIndex,
    setBatchIndex,
    isReady,
    resetSave,
    flushNow,
    getLastPersistMeta,
    saveNow,
    storageKey,
    usedWordIds,
    addUsedWordIds,
    removeUsedWordIds,
    progress,
    totalWordsForLevel,
  } as const;
}
