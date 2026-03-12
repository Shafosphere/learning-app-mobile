import {
  countGlobalBoxPromotions,
  getGlobalDailyStreakDays,
} from "@/src/db/sqlite/db";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLearningStats } from "./LearningStatsContext";

export type NavbarStatKey = "mastered" | "streak" | "promotions";

export type StatBurst = {
  masteredDelta: 0 | 1;
  streakDelta: 0 | 1;
  promotionsDelta: 0 | 1;
};

export type NavbarStatsSnapshot = {
  masteredCount: number;
  streakDays: number;
  promotionsCount: number;
};

export type NavbarStatBurstEvent = {
  id: number;
  deltas: StatBurst;
  keys: NavbarStatKey[];
  comboCount: number;
  pinKey: NavbarStatKey;
  pinDurationMs: number;
  sparkle: boolean;
};

type NavbarStatsContextValue = {
  stats: NavbarStatsSnapshot;
  activeStatKey: NavbarStatKey;
  currentBurst: NavbarStatBurstEvent | null;
  applyStatBurst: (burst: StatBurst) => void;
  acknowledgeCurrentBurst: () => void;
  getStatsSnapshot: () => NavbarStatsSnapshot;
};

const ROTATION_ORDER: readonly NavbarStatKey[] = [
  "mastered",
  "streak",
  "promotions",
];
const ROTATION_INTERVAL_MS = 6400;
const BASE_PIN_MS = 2800;

const defaultStats: NavbarStatsSnapshot = {
  masteredCount: 0,
  streakDays: 0,
  promotionsCount: 0,
};

const defaultValue: NavbarStatsContextValue = {
  stats: defaultStats,
  activeStatKey: "mastered",
  currentBurst: null,
  applyStatBurst: () => {},
  acknowledgeCurrentBurst: () => {},
  getStatsSnapshot: () => defaultStats,
};

const NavbarStatsContext =
  createContext<NavbarStatsContextValue>(defaultValue);

const getBurstKeys = (burst: StatBurst): NavbarStatKey[] =>
  ROTATION_ORDER.filter((key) => {
    if (key === "mastered") return burst.masteredDelta > 0;
    if (key === "streak") return burst.streakDelta > 0;
    return burst.promotionsDelta > 0;
  });

const getPinKey = (burst: StatBurst): NavbarStatKey | null => {
  if (burst.masteredDelta > 0) return "mastered";
  if (burst.streakDelta > 0) return "streak";
  if (burst.promotionsDelta > 0) return "promotions";
  return null;
};

const getPinDurationMs = (comboCount: number) => {
  if (comboCount >= 3) return BASE_PIN_MS + 550;
  if (comboCount === 2) return BASE_PIN_MS + 400;
  return BASE_PIN_MS;
};

export function NavbarStatsProvider({ children }: { children: ReactNode }) {
  const { knownWordsCount } = useLearningStats();
  const [stats, setStats] = useState<NavbarStatsSnapshot>({
    masteredCount: knownWordsCount,
    streakDays: 0,
    promotionsCount: 0,
  });
  const statsRef = useRef(stats);
  const [activeStatKey, setActiveStatKey] =
    useState<NavbarStatKey>("mastered");
  const rotationIndexRef = useRef(0);
  const [currentBurst, setCurrentBurst] = useState<NavbarStatBurstEvent | null>(
    null,
  );
  const currentBurstRef = useRef<NavbarStatBurstEvent | null>(null);
  const burstQueueRef = useRef<NavbarStatBurstEvent[]>([]);
  const burstIdRef = useRef(1);
  const pinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPinnedRef = useRef(false);

  const syncStats = useCallback(
    (
      next:
        | NavbarStatsSnapshot
        | ((current: NavbarStatsSnapshot) => NavbarStatsSnapshot),
    ) => {
      setStats((current) => {
        const resolved = typeof next === "function" ? next(current) : next;
        statsRef.current = resolved;
        return resolved;
      });
    },
    [],
  );

  const syncActiveStatKey = useCallback((nextKey: NavbarStatKey) => {
    rotationIndexRef.current = ROTATION_ORDER.indexOf(nextKey);
    setActiveStatKey(nextKey);
  }, []);

  const advanceStat = useCallback(() => {
    const nextIndex = (rotationIndexRef.current + 1) % ROTATION_ORDER.length;
    syncActiveStatKey(ROTATION_ORDER[nextIndex] ?? "mastered");
  }, [syncActiveStatKey]);

  const schedulePinRelease = useCallback(
    (pinKey: NavbarStatKey, durationMs: number) => {
      isPinnedRef.current = true;
      syncActiveStatKey(pinKey);

      if (pinTimeoutRef.current != null) {
        clearTimeout(pinTimeoutRef.current);
      }

      pinTimeoutRef.current = setTimeout(() => {
        isPinnedRef.current = false;
        advanceStat();
      }, durationMs);
    },
    [advanceStat, syncActiveStatKey],
  );

  const setCurrentBurstSynced = useCallback(
    (burst: NavbarStatBurstEvent | null) => {
      currentBurstRef.current = burst;
      setCurrentBurst(burst);
    },
    [],
  );

  const acknowledgeCurrentBurst = useCallback(() => {
    const nextBurst = burstQueueRef.current.shift() ?? null;
    setCurrentBurstSynced(nextBurst);
  }, [setCurrentBurstSynced]);

  const getStatsSnapshot = useCallback(() => statsRef.current, []);

  const applyStatBurst = useCallback(
    (burst: StatBurst) => {
      const pinKey = getPinKey(burst);
      if (!pinKey) {
        return;
      }

      const keys = getBurstKeys(burst);
      const comboCount = keys.length;

      syncStats((current) => ({
        masteredCount: current.masteredCount + burst.masteredDelta,
        streakDays: current.streakDays + burst.streakDelta,
        promotionsCount: current.promotionsCount + burst.promotionsDelta,
      }));

      const event: NavbarStatBurstEvent = {
        id: burstIdRef.current++,
        deltas: burst,
        keys,
        comboCount,
        pinKey,
        pinDurationMs: getPinDurationMs(comboCount),
        sparkle: comboCount >= 3,
      };

      if (currentBurstRef.current == null) {
        setCurrentBurstSynced(event);
      } else {
        burstQueueRef.current.push(event);
      }

      schedulePinRelease(pinKey, event.pinDurationMs);
    },
    [schedulePinRelease, setCurrentBurstSynced, syncStats],
  );

  useEffect(() => {
    syncStats((current) =>
      current.masteredCount === knownWordsCount
        ? current
        : {
            ...current,
            masteredCount: knownWordsCount,
          },
    );
  }, [knownWordsCount, syncStats]);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const [streakDays, promotionsCount] = await Promise.all([
          getGlobalDailyStreakDays(),
          countGlobalBoxPromotions(),
        ]);

        if (!mounted) {
          return;
        }

        syncStats((current) => ({
          masteredCount: knownWordsCount,
          streakDays: Math.max(current.streakDays, streakDays),
          promotionsCount: Math.max(
            current.promotionsCount,
            promotionsCount,
          ),
        }));
      } catch (error) {
        if (__DEV__) {
          console.warn("[NavbarStats] Failed to load initial stats", error);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [knownWordsCount, syncStats]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPinnedRef.current) {
        advanceStat();
      }
    }, ROTATION_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [advanceStat]);

  useEffect(() => {
    return () => {
      if (pinTimeoutRef.current != null) {
        clearTimeout(pinTimeoutRef.current);
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      stats,
      activeStatKey,
      currentBurst,
      applyStatBurst,
      acknowledgeCurrentBurst,
      getStatsSnapshot,
    }),
    [
      acknowledgeCurrentBurst,
      activeStatKey,
      applyStatBurst,
      currentBurst,
      getStatsSnapshot,
      stats,
    ],
  );

  return (
    <NavbarStatsContext.Provider value={value}>
      {children}
    </NavbarStatsContext.Provider>
  );
}

export function useNavbarStats() {
  return useContext(NavbarStatsContext);
}
