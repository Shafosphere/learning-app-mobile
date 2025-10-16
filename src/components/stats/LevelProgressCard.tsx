import React from "react";
import { Text } from "react-native";
import { useBoxesPersistenceSnapshot } from "@/src/hooks/useBoxesPersistenceSnapshot";
import type { CEFRLevel } from "@/src/types/language";
import type { LanguageCourse } from "@/src/types/course";
import ProgressBar from "./ProgressBar";
import StatsCard from "./StatsCard";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

type Props = {
  level: CEFRLevel;
  course: LanguageCourse;
};

const useStyles = createThemeStylesHook((colors) => ({
  meta: {
    fontSize: 13,
    color: colors.paragraph,
    marginTop: 8,
  },
}));

const LevelProgressCard: React.FC<Props> = ({ level, course }) => {
  const styles = useStyles();
  const hasLanguageIds =
    course.sourceLangId != null && course.targetLangId != null;
  const sourceLangId = hasLanguageIds ? course.sourceLangId! : 0;
  const targetLangId = hasLanguageIds ? course.targetLangId! : 0;

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
          Brak danych kursu – powiąż języki, aby śledzić postępy.
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
