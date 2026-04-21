import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePersistedState } from "../hooks/usePersistedState";
import { countTotalLearnedWordsGlobal } from "../db/sqlite/db";

type LearningStatsContextValue = {
  knownWordsCount: number;
  lastKnownWordDate: string; // ISO date (YYYY-MM-DD)
  dailyProgressCount: number;
  dailyProgressDate: string;
  registerKnownWord: (wordId: number) => {
    wasNewMastered: boolean;
    nextKnownWordsCount: number;
  };
  refreshStats: () => Promise<void>;
};

const defaultValue: LearningStatsContextValue = {
  knownWordsCount: 0,
  lastKnownWordDate: "",
  dailyProgressCount: 0,
  dailyProgressDate: "",
  registerKnownWord: () => ({
    wasNewMastered: false,
    nextKnownWordsCount: 0,
  }),
  refreshStats: async () => {},
};

const LearningStatsContext =
  createContext<LearningStatsContextValue>(defaultValue);

function isoDateOnly(d: Date): string {
  // Ensures "YYYY-MM-DD"
  return d.toISOString().slice(0, 10);
}

type KnownWordsState = {
  ids: number[];
  lastLearnedDate: string;
};

function parseKnownWordsState(raw: string | null): KnownWordsState {
  if (!raw) {
    return { ids: [], lastLearnedDate: "" };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<KnownWordsState>;
    return {
      ids: Array.isArray(parsed?.ids)
        ? parsed.ids.filter((value): value is number => Number.isInteger(value))
        : [],
      lastLearnedDate:
        typeof parsed?.lastLearnedDate === "string" ? parsed.lastLearnedDate : "",
    };
  } catch {
    return { ids: [], lastLearnedDate: "" };
  }
}

function parseDailyProgressState(raw: string | null): {
  date: string;
  count: number;
} {
  if (!raw) {
    return { date: "", count: 0 };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<{ date: string; count: number }>;
    return {
      date: typeof parsed?.date === "string" ? parsed.date : "",
      count: typeof parsed?.count === "number" ? parsed.count : 0,
    };
  } catch {
    return { date: "", count: 0 };
  }
}

export const LearningStatsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [dbKnownWordsCount, setDbKnownWordsCount] = useState<number | null>(
    null
  );
  const [knownWords, setKnownWords] = usePersistedState<KnownWordsState>(
    "knownWords",
    { ids: [], lastLearnedDate: "" }
  );
  const [dailyProgress, setDailyProgress] = usePersistedState<{
    date: string;
    count: number;
  }>("dailyProgress", { date: "", count: 0 });
  const refreshStats = useCallback(async () => {
    const [knownWordsRaw, dailyProgressRaw, total] = await Promise.all([
      AsyncStorage.getItem("knownWords"),
      AsyncStorage.getItem("dailyProgress"),
      countTotalLearnedWordsGlobal(),
    ]);

    await Promise.all([
      setKnownWords(parseKnownWordsState(knownWordsRaw)),
      setDailyProgress(parseDailyProgressState(dailyProgressRaw)),
    ]);
    setDbKnownWordsCount(total);
  }, [setDailyProgress, setKnownWords]);

  const registerKnownWord = (wordId: number) => {
    const today = isoDateOnly(new Date());
    const baseDailyCount =
      dailyProgress.date === today ? dailyProgress.count : 0;
    const nextDailyCount = baseDailyCount + 1;

    void setDailyProgress({ date: today, count: nextDailyCount });

    const alreadyKnown = knownWords.ids.includes(wordId);
    let nextKnownWordsTotal = knownWords.ids.length;
    let wasNewMastered = false;

    if (!alreadyKnown) {
      const nextIds = [wordId, ...knownWords.ids];
      nextKnownWordsTotal = nextIds.length;
      wasNewMastered = true;
      void setKnownWords({
        ids: nextIds,
        lastLearnedDate: today,
      });
      setDbKnownWordsCount((prev) =>
        Math.max(prev ?? 0, nextKnownWordsTotal)
      );
    } else {
      if (knownWords.lastLearnedDate !== today) {
        void setKnownWords({
          ids: knownWords.ids,
          lastLearnedDate: today,
        });
      }
    }

    void countTotalLearnedWordsGlobal()
      .then((total) => {
        setDbKnownWordsCount(total);
      })
      .catch((error) => {
          console.log("Nie udało się odczytać liczby opanowanych słówek:", error);
      });

    return {
      wasNewMastered,
      nextKnownWordsCount: nextKnownWordsTotal,
    };
  };

  useEffect(() => {
    let mounted = true;
    void countTotalLearnedWordsGlobal()
      .then((total) => {
        if (mounted) {
          setDbKnownWordsCount(total);
        }
      })
      .catch((error) => {
        if (mounted) {
          console.log(
            "Nie udało się wczytać początkowej liczby opanowanych słówek:",
            error
          );
          setDbKnownWordsCount(null);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const knownWordsCount = Math.max(
    dbKnownWordsCount ?? 0,
    knownWords.ids.length
  );

  return (
    <LearningStatsContext.Provider
      value={{
        knownWordsCount,
        lastKnownWordDate: knownWords.lastLearnedDate,
        dailyProgressCount: dailyProgress.count,
        dailyProgressDate: dailyProgress.date,
        registerKnownWord,
        refreshStats,
      }}
    >
      {children}
    </LearningStatsContext.Provider>
  );
};

export const useLearningStats = () => useContext(LearningStatsContext);
