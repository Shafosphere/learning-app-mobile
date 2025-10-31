import React, { createContext, useContext, useEffect, useState } from "react";
import { usePersistedState } from "../hooks/usePersistedState";
import { ACHIEVEMENTS } from "../constants/achievements";
import { useSettings } from "./SettingsContext";
import { countTotalLearnedWordsGlobal } from "../db/sqlite/db";

export type AchievementState = {
  unlockedAt: string;
};

export type AchievementsMap = Record<string, AchievementState>;

type LearningStatsContextValue = {
  knownWordsCount: number;
  lastKnownWordDate: string; // ISO date (YYYY-MM-DD)
  dailyProgressCount: number;
  dailyProgressDate: string;
  achievements: AchievementsMap;
  registerKnownWord: (wordId: number) => void;
};

const defaultValue: LearningStatsContextValue = {
  knownWordsCount: 0,
  lastKnownWordDate: "",
  dailyProgressCount: 0,
  dailyProgressDate: "",
  achievements: {},
  registerKnownWord: () => {},
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

export const LearningStatsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { dailyGoal } = useSettings();
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
  const [achievements, setAchievements] = usePersistedState<AchievementsMap>(
    "achievements",
    {}
  );

  const unlockAchievements = (params: {
    nextKnownWords?: number;
    nextDailyCount: number;
  }) => {
    const { nextKnownWords, nextDailyCount } = params;
    let hasChanges = false;
    let nextAchievements = achievements;
    const nowIso = new Date().toISOString();

    for (const achievement of ACHIEVEMENTS) {
      if (nextAchievements[achievement.id]) continue;

      if (achievement.type === "knownWords") {
        if (
          nextKnownWords == null ||
          nextKnownWords < achievement.threshold
        ) {
          continue;
        }
      }

      if (achievement.type === "dailyGoal") {
        if (!dailyGoal || nextDailyCount < dailyGoal) {
          continue;
        }
      }

      if (!hasChanges) {
        hasChanges = true;
        nextAchievements = { ...achievements };
      }
      nextAchievements[achievement.id] = { unlockedAt: nowIso };
    }

    if (hasChanges) {
      void setAchievements(nextAchievements);
    }
  };

  const registerKnownWord = (wordId: number) => {
    const today = isoDateOnly(new Date());
    const baseDailyCount =
      dailyProgress.date === today ? dailyProgress.count : 0;
    const nextDailyCount = baseDailyCount + 1;

    void setDailyProgress({ date: today, count: nextDailyCount });

    const alreadyKnown = knownWords.ids.includes(wordId);
    let nextKnownWordsTotal = knownWords.ids.length;

    if (!alreadyKnown) {
      const nextIds = [wordId, ...knownWords.ids];
      nextKnownWordsTotal = nextIds.length;
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

    unlockAchievements({
      nextKnownWords: nextKnownWordsTotal,
      nextDailyCount,
    });

    void countTotalLearnedWordsGlobal()
      .then((total) => {
        setDbKnownWordsCount(total);
      })
      .catch((error) => {
        console.log("Nie udało się odczytać liczby opanowanych słówek:", error);
      });
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
        achievements,
        registerKnownWord,
      }}
    >
      {children}
    </LearningStatsContext.Provider>
  );
};

export const useLearningStats = () => useContext(LearningStatsContext);
