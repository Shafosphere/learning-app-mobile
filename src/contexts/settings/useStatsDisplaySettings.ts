import { useCallback } from "react";

import { usePersistedState } from "@/src/hooks/usePersistedState";

export function useStatsDisplaySettings() {
  const [statsFireEffectEnabled, persistStatsFireEffectEnabled] =
    usePersistedState<boolean>("stats.fireEffectEnabled", false);
  const [statsBookshelfEnabled, persistStatsBookshelfEnabled] =
    usePersistedState<boolean>("stats.bookshelfEnabled", false);

  const setStatsFireEffectEnabled = useCallback(
    async (value: boolean) => {
      await persistStatsFireEffectEnabled(value);
    },
    [persistStatsFireEffectEnabled]
  );

  const toggleStatsFireEffectEnabled = useCallback(async () => {
    await setStatsFireEffectEnabled(!statsFireEffectEnabled);
  }, [setStatsFireEffectEnabled, statsFireEffectEnabled]);

  const setStatsBookshelfEnabled = useCallback(
    async (value: boolean) => {
      await persistStatsBookshelfEnabled(value);
    },
    [persistStatsBookshelfEnabled]
  );

  const toggleStatsBookshelfEnabled = useCallback(async () => {
    await setStatsBookshelfEnabled(!statsBookshelfEnabled);
  }, [setStatsBookshelfEnabled, statsBookshelfEnabled]);

  return {
    statsFireEffectEnabled,
    setStatsFireEffectEnabled,
    toggleStatsFireEffectEnabled,
    statsBookshelfEnabled,
    setStatsBookshelfEnabled,
    toggleStatsBookshelfEnabled,
  };
}
