import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
// Adjust import path to your project
import { BoxesState, WordWithTranslations } from "@/src/types/boxes";

// ---- Public helpers --------------------------------------------------------
export type BoxName = keyof BoxesState; // "boxOne" | ... | "boxFive"
export const boxOrder: BoxName[] = [
  "boxOne",
  "boxTwo",
  "boxThree",
  "boxFour",
  "boxFive",
];

export function makeProfileKey(profile: {
  sourceLangId?: number | null;
  targetLangId?: number | null;
  sourceLang?: string | null; // e.g. "EN"
  targetLang?: string | null; // e.g. "PL"
}) {
  const byId =
    profile.sourceLangId != null && profile.targetLangId != null
      ? `${profile.sourceLangId}-${profile.targetLangId}`
      : null;
  const byCode =
    profile.sourceLang && profile.targetLang
      ? `${profile.sourceLang}-${profile.targetLang}`
      : null;
  return byId ?? byCode ?? "unknown-profile";
}

export type SavedBoxesV2 = {
  v: 2;
  updatedAt: number; // epoch ms
  profileId: string; // e.g. "1-2-A1"
  sourceLangId: number;
  targetLangId: number;
  level: string; // "A1" | ... | "C2"
  batchIndex: number;
  flashcards: BoxesState; // full snapshot of boxes state
};

export function makeScopeId(
  sourceLangId: number,
  targetLangId: number,
  level: string
) {
  return `${sourceLangId}-${targetLangId}-${level}`;
}

async function saveToStorageSnapshot(
  key: string,
  meta: {
    sourceLangId: number;
    targetLangId: number;
    level: string;
    batchIndex: number;
  },
  boxes: BoxesState
) {
  const payload: SavedBoxesV2 = {
    v: 2,
    updatedAt: Date.now(),
    profileId: makeScopeId(meta.sourceLangId, meta.targetLangId, meta.level),
    sourceLangId: meta.sourceLangId,
    targetLangId: meta.targetLangId,
    level: meta.level,
    batchIndex: meta.batchIndex,
    flashcards: boxes,
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

  const [boxes, setBoxes] = useState<BoxesState>({
    boxOne: [],
    boxTwo: [],
    boxThree: [],
    boxFour: [],
    boxFive: [],
  });
  const [batchIndex, setBatchIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);
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
            setBoxes(saved.flashcards);
            setBatchIndex(saved.batchIndex ?? 0);
          }
        } else if (initialWords && mounted) {
          setBoxes({
            boxOne: initialWords,
            boxTwo: [],
            boxThree: [],
            boxFour: [],
            boxFive: [],
          });
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

  // Autosave when boxes change
  useEffect(() => {
    if (!autosave || !isReady) return;
    if (isRestoringRef.current) return; // avoid saving right after load

    if (savingTimer.current) clearTimeout(savingTimer.current);
    savingTimer.current = setTimeout(() => {
      saveToStorageSnapshot(
        storageKey,
        { sourceLangId, targetLangId, level, batchIndex },
        boxes
      ).catch(() => {});
    }, saveDelayMs);
  }, [
    boxes,
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
      boxes
    );
  }, [storageKey, boxes, sourceLangId, targetLangId, level, batchIndex]);

  return {
    boxes,
    setBoxes,
    batchIndex,
    setBatchIndex,
    isReady,
    resetSave,
    saveNow,
    storageKey,
  } as const;
}
