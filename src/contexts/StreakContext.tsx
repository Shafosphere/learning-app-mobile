import React, { createContext, useContext } from "react";
import { usePersistedState } from "../hooks/usePersistedState";
import { ACHIEVEMENTS } from "../constants/achievements";
import { useSettings } from "./SettingsContext";

export type AchievementState = {
  unlockedAt: string;
};

export type AchievementsMap = Record<string, AchievementState>;

type StreakContextValue = {
  streakCount: number;
  lastDate: string; // ISO date (YYYY-MM-DD)
  dailyProgressCount: number;
  dailyProgressDate: string;
  achievements: AchievementsMap;
  registerLearningEvent: () => void; // per request, sync signature
};

const defaultValue: StreakContextValue = {
  streakCount: 0,
  lastDate: "",
  dailyProgressCount: 0,
  dailyProgressDate: "",
  achievements: {},
  registerLearningEvent: () => {},
};

const StreakContext = createContext<StreakContextValue>(defaultValue);

function isoDateOnly(d: Date): string {
  // Ensures "YYYY-MM-DD"
  return d.toISOString().slice(0, 10);
}

function getYesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return isoDateOnly(d);
}

export const StreakProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { dailyGoal } = useSettings();
  const [streakCount, setStreakCount] = usePersistedState<number>(
    "streakCount",
    0
  );
  const [lastDate, setLastDate] = usePersistedState<string>(
    "streakLastDate",
    ""
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
    nextStreak?: number;
    nextDailyCount: number;
  }) => {
    const { nextStreak, nextDailyCount } = params;
    let hasChanges = false;
    let nextAchievements = achievements;
    const nowIso = new Date().toISOString();

    for (const achievement of ACHIEVEMENTS) {
      if (nextAchievements[achievement.id]) continue;

      if (achievement.type === "streak") {
        if (nextStreak == null || nextStreak < achievement.threshold) {
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

  const registerLearningEvent = () => {
    const today = isoDateOnly(new Date());
    const baseDailyCount =
      dailyProgress.date === today ? dailyProgress.count : 0;
    const nextDailyCount = baseDailyCount + 1;

    void setDailyProgress({ date: today, count: nextDailyCount });
    unlockAchievements({ nextDailyCount });

    // If already logged today, do nothing for streak but keep daily progress.
    if (lastDate === today) return;

    const yesterday = getYesterdayIso();
    const nextCount = lastDate === yesterday ? streakCount + 1 : 1;

    // Fire-and-forget persistence to keep sync signature
    void setStreakCount(nextCount);
    void setLastDate(today);

    unlockAchievements({ nextStreak: nextCount, nextDailyCount });
  };

  return (
    <StreakContext.Provider
      value={{
        streakCount,
        lastDate,
        dailyProgressCount: dailyProgress.count,
        dailyProgressDate: dailyProgress.date,
        achievements,
        registerLearningEvent,
      }}
    >
      {children}
    </StreakContext.Provider>
  );
};

export const useStreak = () => useContext(StreakContext);
