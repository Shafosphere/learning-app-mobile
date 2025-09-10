import React, { createContext, useContext } from "react";
import { usePersistedState } from "../hooks/usePersistedState";

type StreakContextValue = {
  streakCount: number;
  lastDate: string; // ISO date (YYYY-MM-DD)
  registerLearningEvent: () => void; // per request, sync signature
};

const defaultValue: StreakContextValue = {
  streakCount: 0,
  lastDate: "",
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
  const [streakCount, setStreakCount] = usePersistedState<number>(
    "streakCount",
    0
  );
  const [lastDate, setLastDate] = usePersistedState<string>("streakLastDate", "");

  const registerLearningEvent = () => {
    const today = isoDateOnly(new Date());
    // If already logged today, do nothing
    if (lastDate === today) return;

    const yesterday = getYesterdayIso();
    const nextCount = lastDate === yesterday ? streakCount + 1 : 1;

    // Fire-and-forget persistence to keep sync signature
    void setStreakCount(nextCount);
    void setLastDate(today);
  };

  return (
    <StreakContext.Provider
      value={{ streakCount, lastDate, registerLearningEvent }}
    >
      {children}
    </StreakContext.Provider>
  );
};

export const useStreak = () => useContext(StreakContext);

