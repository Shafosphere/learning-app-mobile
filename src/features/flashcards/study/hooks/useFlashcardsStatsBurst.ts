import { useCallback } from "react";
import { type StatBurst, useNavbarStats } from "@/src/contexts/NavbarStatsContext";
import { registerProtectedDailyActivity } from "@/src/services/streakProtection";

type FlashcardsStatsBurstInput = {
  logLearningEventPromise: Promise<void>;
  deltas: Pick<StatBurst, "masteredDelta" | "promotionsDelta">;
};

export function useFlashcardsStatsBurst(refreshErrorMessage: string) {
  const { applyStatBurst, getStatsSnapshot } = useNavbarStats();

  return useCallback(
    async ({ logLearningEventPromise, deltas }: FlashcardsStatsBurstInput) => {
      const baseBurst: StatBurst = { ...deltas, streakDelta: 0 };
      const hasBaseDelta =
        baseBurst.masteredDelta > 0 || baseBurst.promotionsDelta > 0;

      await logLearningEventPromise;

      let streakDelta: 0 | 1 = 0;
      let streakDaysOverride: number | undefined;
      let shieldCountOverride: 0 | 1 | 2 | undefined;
      try {
        const nextStreak = await registerProtectedDailyActivity();
        const currentStats = getStatsSnapshot();
        if (nextStreak.streakDays !== currentStats.streakDays) {
          if (nextStreak.streakDays > currentStats.streakDays) {
            streakDelta = 1;
          }
          streakDaysOverride = nextStreak.streakDays;
        }
        if (nextStreak.shieldCount !== currentStats.shieldCount) {
          shieldCountOverride = nextStreak.shieldCount;
        }
      } catch (error) {
        console.warn(refreshErrorMessage, error);
      }

      if (
        !hasBaseDelta &&
        streakDelta === 0 &&
        streakDaysOverride == null &&
        shieldCountOverride == null
      ) {
        return;
      }

      applyStatBurst({
        ...baseBurst,
        streakDelta,
        ...(streakDaysOverride == null ? {} : { streakDaysOverride }),
        ...(shieldCountOverride == null ? {} : { shieldCountOverride }),
      });
    },
    [applyStatBurst, getStatsSnapshot, refreshErrorMessage],
  );
}
