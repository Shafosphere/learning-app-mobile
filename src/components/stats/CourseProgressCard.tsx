import React, { useEffect, useState } from "react";
import { Text } from "react-native";
import StatsCard from "./StatsCard";
import ProgressBar from "./ProgressBar";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  countLearnedWordsByLevel,
  getTotalWordsForLevel,
  countCustomFlashcardsForCourse,
  countCustomLearnedForCourse,
} from "@/src/db/sqlite/db";
import type { CEFRLevel } from "@/src/types/language";

const LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const useStyles = createThemeStylesHook((colors) => ({
  meta: {
    marginTop: 8,
    fontSize: 13,
    color: colors.paragraph,
  },
}));

export default function CourseProgressCard() {
  const styles = useStyles();
  const { activeCourse, activeCustomCourseId } = useSettings();
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<{ learned: number; total: number }>(
    { learned: 0, total: 0 }
  );
  const [title, setTitle] = useState<string>("Postęp przypiętego kursu");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Custom course pinned
        if (activeCustomCourseId != null) {
          const [learned, total] = await Promise.all([
            countCustomLearnedForCourse(activeCustomCourseId),
            countCustomFlashcardsForCourse(activeCustomCourseId),
          ]);
          if (!mounted) return;
          setTitle("Postęp własnego kursu");
          setSummary({ learned, total });
          setProgress(total > 0 ? Math.min(1, learned / total) : 0);
          return;
        }

        // Built-in course pinned
        if (
          activeCourse &&
          activeCourse.sourceLangId != null &&
          activeCourse.targetLangId != null
        ) {
          const learnedMap = await countLearnedWordsByLevel(
            activeCourse.sourceLangId,
            activeCourse.targetLangId
          );
          if (!mounted) return;

          // If course defines a single level, show that level only
          const lvl = activeCourse.level ?? null;
          if (lvl) {
            const [total] = await Promise.all([
              getTotalWordsForLevel(activeCourse.sourceLangId!, lvl),
            ]);
            if (!mounted) return;
            const learned = learnedMap[lvl] ?? 0;
            setTitle(`Postęp kursu ${lvl}`);
            setSummary({ learned, total });
            setProgress(total > 0 ? Math.min(1, learned / total) : 0);
          } else {
            // Aggregate across levels
            const totals = await Promise.all(
              LEVELS.map(async (l) => [l, await getTotalWordsForLevel(activeCourse.sourceLangId!, l)] as const)
            );
            if (!mounted) return;
            const learned = LEVELS.reduce((acc, l) => acc + (learnedMap[l] ?? 0), 0);
            const total = totals.reduce((acc, [, v]) => acc + (v ?? 0), 0);
            setTitle("Postęp przypiętego kursu");
            setSummary({ learned, total });
            setProgress(total > 0 ? Math.min(1, learned / total) : 0);
          }
          return;
        }

        // No pinned course
        if (mounted) {
          setTitle("Brak przypiętego kursu");
          setProgress(0);
          setSummary({ learned: 0, total: 0 });
        }
      } catch {
        if (mounted) {
          setTitle("Postęp przypiętego kursu");
          setProgress(0);
          setSummary({ learned: 0, total: 0 });
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeCourse, activeCustomCourseId]);

  // Hide when absolutely no course is pinned
  if (!activeCourse && activeCustomCourseId == null) return null;

  return (
    <StatsCard title={title}>
      <ProgressBar value={progress} label="Postęp" />
      <Text style={styles.meta}>
        {summary.total > 0
          ? `${summary.learned} / ${summary.total} słówek opanowanych`
          : `${summary.learned} słówek opanowanych`}
      </Text>
    </StatsCard>
  );
}
