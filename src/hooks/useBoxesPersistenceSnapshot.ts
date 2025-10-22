import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
// Adjust import path to your project
import { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import { getTotalWordsForLevel } from "@/src/db/sqlite/db";

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
  } catch (_) {
    // ignore parse errors
  }
}

async function saveToStorageSnapshot(
  key: string,
  meta: {
    sourceLangId: number;
    targetLangId: number;
    level: string;
    batchIndex: number;
  },
  boxes: BoxesState,
  usedWordIds: number[]
) {
  const payload: SavedBoxesV2 = {
    v: 2,
    updatedAt: Date.now(),
    courseId: makeScopeId(meta.sourceLangId, meta.targetLangId, meta.level),
    sourceLangId: meta.sourceLangId,
    targetLangId: meta.targetLangId,
    level: meta.level,
    batchIndex: meta.batchIndex,
    flashcards: boxes,
    usedWordIds,
  };
  await AsyncStorage.setItem(key, JSON.stringify(payload));
}

async function loadFromStorageSnapshot(
  key: string
): Promise<SavedBoxesV2 | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!parsed || parsed.v !== 2) return null;
  return parsed as SavedBoxesV2;
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
}) {
  const {
    sourceLangId,
    targetLangId,
    level,
    storageNamespace = "boxes",
    initialWords,
    autosave = true,
    saveDelayMs = 0,
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
  const [totalWordsForLevel, setTotalWordsForLevel] = useState<number>(0);
  const savingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRestoringRef = useRef(true);

  useEffect(() => {
    return () => {
      if (savingTimer.current) {
        clearTimeout(savingTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await loadFromStorageSnapshot(storageKey);
        if (saved) {
          if (mounted) {
            setBoxes(normalizeBoxes(saved.flashcards));
            setBatchIndex(saved.batchIndex ?? 0);
            setUsedWordIds(saved.usedWordIds ?? []);
          }
        } else if (initialWords && mounted) {
          setBoxes({
            ...createEmptyBoxes(),
            boxOne: initialWords,
          });
          setBatchIndex(0);
          setUsedWordIds(initialWords.map((w) => w.id));
        } else if (mounted) {
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
  }, [storageKey]);

  // Fetch total words for current level/language to compute progress
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!sourceLangId || !level) {
          if (mounted) setTotalWordsForLevel(0);
          return;
        }
        const total = await getTotalWordsForLevel(sourceLangId, level);
        if (mounted) setTotalWordsForLevel(total || 0);
      } catch (_) {
        if (mounted) setTotalWordsForLevel(0);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [sourceLangId, level]);

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

    if (savingTimer.current) clearTimeout(savingTimer.current);
    savingTimer.current = setTimeout(() => {
      saveToStorageSnapshot(
        storageKey,
        { sourceLangId, targetLangId, level, batchIndex },
        boxes,
        usedWordIds
      ).catch(() => {});
    }, saveDelayMs);
  }, [
    boxes,
    usedWordIds,
    autosave,
    isReady,
    saveDelayMs,
    storageKey,
    sourceLangId,
    targetLangId,
    level,
    batchIndex,
  ]);

  const resetSave = useCallback(async () => {
    await AsyncStorage.removeItem(storageKey);
  }, [storageKey]);

  const saveNow = useCallback(async () => {
    await saveToStorageSnapshot(
      storageKey,
      { sourceLangId, targetLangId, level, batchIndex },
      boxes,
      usedWordIds
    );
  }, [
    storageKey,
    boxes,
    usedWordIds,
    sourceLangId,
    targetLangId,
    level,
    batchIndex,
  ]);

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
    saveNow,
    storageKey,
    usedWordIds,
    addUsedWordIds,
    removeUsedWordIds,
    progress,
    totalWordsForLevel,
  } as const;
}
