import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import StatsCard from "./StatsCard";
import ProgressBar from "./ProgressBar";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { useSettings } from "@/src/contexts/SettingsContext";
import { countLearnedWordsByLevel, getTotalWordsForLevel } from "@/src/db/sqlite/db";
import type { CEFRLevel } from "@/src/types/language";
import type { LanguageCourse } from "@/src/types/course";

const LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const LANGUAGE_LABELS: Record<string, string> = {
  pl: "polski",
  en: "angielski",
  fr: "francuski",
  es: "hiszpański",
  de: "niemiecki",
  pm: "francuski",
  kr: "koreański",
};
const LANGUAGE_LABELS_BY_TARGET: Record<string, Record<string, string>> = {
  pl: {
    en: "angielski",
    fr: "francuski",
    es: "hiszpański",
    de: "niemiecki",
    pm: "francuski",
    kr: "koreański",
  },
};

type Item = {
  key: string;
  label: string;
  learned: number;
  total: number;
  progress: number; // 0..1
};

const useStyles = createThemeStylesHook((colors) => ({
  row: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.headline,
    marginBottom: 6,
  },
  empty: {
    color: colors.paragraph,
    fontSize: 13,
  },
}));

function labelForCourse(c: LanguageCourse): string {
  const targetLabels = c.targetLang ? LANGUAGE_LABELS_BY_TARGET[c.targetLang] : undefined;
  const langCode =
    (targetLabels && c.sourceLang && targetLabels[c.sourceLang]
      ? c.sourceLang
      : c.targetLang) ?? c.sourceLang;

  const langLabel =
    (targetLabels && c.sourceLang ? targetLabels[c.sourceLang] : undefined) ??
    (langCode ? LANGUAGE_LABELS[langCode] ?? langCode.toUpperCase() : "kurs");
  const lvl = c.level ? ` ${c.level}` : "";
  return `${langLabel}${lvl}`;
}

function keyForCourse(c: LanguageCourse): string {
  const a = c.sourceLangId != null ? `src#${c.sourceLangId}` : `src@${c.sourceLang}`;
  const b = c.targetLangId != null ? `tgt#${c.targetLangId}` : `tgt@${c.targetLang}`;
  const lvl = c.level ? `:${c.level}` : ":all";
  return `${a}-${b}${lvl}`;
}

export default function PinnedCoursesProgress() {
  const styles = useStyles();
  const { courses } = useSettings();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const results: Item[] = [];
        for (const c of courses) {
          if (c.sourceLangId == null || c.targetLangId == null) {
            // Skip courses without numeric IDs (unlikely in real data)
            continue;
          }
          const learnedMap = await countLearnedWordsByLevel(
            c.sourceLangId,
            c.targetLangId
          );

          if (c.level) {
            const learned = learnedMap[c.level] ?? 0;
            const total = await getTotalWordsForLevel(c.sourceLangId, c.level);
            results.push({
              key: keyForCourse(c),
              label: labelForCourse(c),
              learned,
              total,
              progress: total > 0 ? Math.min(1, learned / total) : 0,
            });
          } else {
            const totalsPerLevel = await Promise.all(
              LEVELS.map(async (lvl) => [lvl, await getTotalWordsForLevel(c.sourceLangId!, lvl)] as const)
            );
            let learned = 0;
            let total = 0;
            for (const lvl of LEVELS) learned += learnedMap[lvl] ?? 0;
            for (const [, v] of totalsPerLevel) total += v ?? 0;
            results.push({
              key: keyForCourse(c),
              label: labelForCourse(c),
              learned,
              total,
              progress: total > 0 ? Math.min(1, learned / total) : 0,
            });
          }
        }
        if (mounted) setItems(results);
      } catch {
        if (mounted) setItems([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [courses]);

  if (!courses || courses.length === 0) return null;

  return (
    <StatsCard title="Postęp przypiętych kursów">
      {items.length === 0 ? (
        <Text style={styles.empty}>Brak danych do wyświetlenia.</Text>
      ) : (
        <View>
          {items.map((it) => (
            <View key={it.key} style={styles.row}>
              <Text style={styles.label}>{it.label}</Text>
              <ProgressBar value={it.progress} label={`${it.learned} / ${it.total}`} showPercent={true} />
            </View>
          ))}
        </View>
      )}
    </StatsCard>
  );
}
