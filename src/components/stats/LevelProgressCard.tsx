import React from "react";
import { Text } from "react-native";
import { useBoxesPersistenceSnapshot } from "@/src/hooks/useBoxesPersistenceSnapshot";
import type { CEFRLevel } from "@/src/types/language";
import type { LanguageProfile } from "@/src/types/profile";
import ProgressBar from "./ProgressBar";
import StatsCard from "./StatsCard";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

type Props = {
  level: CEFRLevel;
  profile: LanguageProfile;
};

const useStyles = createThemeStylesHook((colors) => ({
  meta: {
    fontSize: 13,
    color: colors.paragraph,
    marginTop: 8,
  },
}));

const LevelProgressCard: React.FC<Props> = ({ level, profile }) => {
  const styles = useStyles();
  const hasLanguageIds =
    profile.sourceLangId != null && profile.targetLangId != null;
  const sourceLangId = hasLanguageIds ? profile.sourceLangId! : 0;
  const targetLangId = hasLanguageIds ? profile.targetLangId! : 0;

  const { progress, totalWordsForLevel, usedWordIds, isReady } =
    useBoxesPersistenceSnapshot({
      sourceLangId,
      targetLangId,
      level,
      autosave: false,
      saveDelayMs: 0,
    });

  const completed = usedWordIds.length;
  const total = totalWordsForLevel || 0;

  return (
    <StatsCard title={`Poziom ${level}`}>
      {!hasLanguageIds ? (
        <Text style={styles.meta}>
          Brak danych profilu – powiąż języki, aby śledzić postępy.
        </Text>
      ) : !isReady ? (
        <Text style={styles.meta}>Ładuję dane…</Text>
      ) : (
        <>
          <ProgressBar value={progress} label="Postęp" />
          <Text style={styles.meta}>
            {total > 0
              ? `${completed} / ${total} słówek przerobionych`
              : `${completed} słówek przerobionych`}
          </Text>
        </>
      )}
    </StatsCard>
  );
};

export default LevelProgressCard;
