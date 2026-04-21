import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";

import { useSettings } from "@/src/contexts/SettingsContext";
import {
  countDueCustomReviews,
  getCustomCoursesWithCardCounts,
} from "@/src/db/sqlite/db";

type DueReviewsContextValue = {
  dueReviewCount: number;
  isRefreshing: boolean;
  lastRefreshedAt: number | null;
  refreshDueReviewCount: () => Promise<void>;
};

const DueReviewsContext = createContext<DueReviewsContextValue | undefined>(
  undefined,
);

export async function computeDueReviewCount(
  pinnedOfficialCourseIds: number[],
  nowMs: number = Date.now(),
): Promise<number> {
  const customRows = await getCustomCoursesWithCardCounts();
  const officialIds = new Set(pinnedOfficialCourseIds);
  const coursesToCount = customRows.filter((course) => {
    if (!course.reviewsEnabled) {
      return false;
    }
    if (course.isOfficial) {
      return officialIds.has(course.id);
    }
    return true;
  });

  const dueCounts = await Promise.all(
    coursesToCount.map(async (course) => {
      try {
        return await countDueCustomReviews(course.id, nowMs);
      } catch (error) {
        console.warn(
          `[DueReviews] Failed to count reviews for course ${course.id}`,
          error,
        );
        return 0;
      }
    }),
  );

  return dueCounts.reduce((sum, count) => sum + count, 0);
}

export function DueReviewsProvider({ children }: { children: ReactNode }) {
  const { pinnedOfficialCourseIds } = useSettings();
  const [dueReviewCount, setDueReviewCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const pinnedOfficialCourseIdsRef = useRef(pinnedOfficialCourseIds);
  const requestedRefreshCountRef = useRef(0);
  const completedRefreshCountRef = useRef(0);

  pinnedOfficialCourseIdsRef.current = pinnedOfficialCourseIds;

  const refreshDueReviewCount = useCallback(async () => {
    requestedRefreshCountRef.current += 1;

    if (refreshPromiseRef.current) {
      await refreshPromiseRef.current;
      return;
    }

    const refreshPromise = (async () => {
      setIsRefreshing(true);
      try {
        while (
          completedRefreshCountRef.current < requestedRefreshCountRef.current
        ) {
          const requestCountToProcess = requestedRefreshCountRef.current;
          const nextCount = await computeDueReviewCount(
            pinnedOfficialCourseIdsRef.current,
          );
          setDueReviewCount(nextCount);
          setLastRefreshedAt(Date.now());
          completedRefreshCountRef.current = requestCountToProcess;
        }
      } catch (error) {
        console.warn("[DueReviews] Failed to refresh due review count", error);
        setDueReviewCount(0);
      } finally {
        setIsRefreshing(false);
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = refreshPromise;
    await refreshPromise;
  }, []);

  useEffect(() => {
    void refreshDueReviewCount();
  }, [pinnedOfficialCourseIds, refreshDueReviewCount]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshDueReviewCount();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshDueReviewCount]);

  const value = useMemo<DueReviewsContextValue>(
    () => ({
      dueReviewCount,
      isRefreshing,
      lastRefreshedAt,
      refreshDueReviewCount,
    }),
    [dueReviewCount, isRefreshing, lastRefreshedAt, refreshDueReviewCount],
  );

  return (
    <DueReviewsContext.Provider value={value}>
      {children}
    </DueReviewsContext.Provider>
  );
}

export function useDueReviews(): DueReviewsContextValue {
  const context = useContext(DueReviewsContext);
  if (!context) {
    throw new Error("useDueReviews must be used within DueReviewsProvider");
  }
  return context;
}
