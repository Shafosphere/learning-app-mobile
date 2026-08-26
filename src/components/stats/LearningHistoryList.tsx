import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { FlatList, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import type { LearningHistoryEvent } from "@/src/db/sqlite/db";
import { PromptImage } from "@/src/components/card/subcomponents/PromptImage";
import { CardMathText } from "@/src/components/card/subcomponents/CardMathText";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

const useStyles = createThemeStylesHook((colors) => ({
  list: { padding: 20, gap: 10 },
  item: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.secondBackground,
    gap: 8,
  },
  row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
  result: { fontSize: 14, fontWeight: "800" as const },
  prompt: { color: colors.headline, fontSize: 16, fontWeight: "700" as const },
  expected: { color: colors.paragraph, fontSize: 14 },
  expectedRow: { flexDirection: "row" as const, alignItems: "center" as const, flexWrap: "wrap" as const },
  image: { width: "100%" as const, height: 100 },
  meta: { color: colors.paragraph, fontSize: 12, opacity: 0.75 },
  empty: { padding: 32, alignItems: "center" as const, gap: 10 },
  emptyTitle: { color: colors.headline, fontSize: 20, fontWeight: "700" as const },
  emptyText: { color: colors.paragraph, fontSize: 14, textAlign: "center" as const },
  dayHeader: {
    color: colors.headline,
    fontSize: 13,
    fontWeight: "800" as const,
    marginTop: 8,
    marginBottom: 2,
  },
}));

function formatDuration(durationMs: number | null, t: (key: string, options?: Record<string, unknown>) => string) {
  if (durationMs == null) return null;
  return t("screens.stats.stats.stats.history.seconds", {
    value: (durationMs / 1000).toFixed(1),
  });
}

function formatBox(
  box: string | null,
  t: (key: string) => string,
) {
  if (!box) return "—";
  const labels: Record<string, string> = {
    boxZero: "zero",
    boxOne: "one",
    boxTwo: "two",
    boxThree: "three",
    boxFour: "four",
    boxFive: "five",
  };
  return t(`screens.stats.stats.stats.history.box.${labels[box] ?? "unknown"}`);
}

function formatUserAnswer(
  item: LearningHistoryEvent,
  t: (key: string) => string,
) {
  const value = item.userAnswer.trim().toLowerCase();
  if (item.cardType === "true_false" && (value === "true" || value === "false")) {
    return t(`screens.stats.stats.stats.history.answer.${value}`);
  }
  if (item.cardType === "know_dont_know" && (value === "true" || value === "false")) {
    return t(`screens.stats.stats.stats.history.answer.${value === "true" ? "know" : "dontKnow"}`);
  }
  return item.userAnswer;
}

function getLocalDayKey(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export default function LearningHistoryList({
  events,
}: {
  events: LearningHistoryEvent[];
}) {
  const styles = useStyles();
  const { t } = useTranslation();

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={events.length ? styles.list : undefined}
      renderItem={({ item, index }) => {
        const duration = formatDuration(item.durationMs, t);
        const previousItem = events[index - 1];
        const isNewDay = index === 0 ||
          getLocalDayKey(item.createdAt) !== getLocalDayKey(previousItem.createdAt);
        return (
          <View>
            {isNewDay ? (
              <Text style={styles.dayHeader}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            ) : null}
            <View style={styles.item}>
            <View style={styles.row}>
              <Ionicons
                name={item.result === "ok" ? "checkmark-circle" : "close-circle"}
                size={20}
                color={item.result === "ok" ? "#16a34a" : "#ef4444"}
              />
              <Text style={[styles.result, { color: item.result === "ok" ? "#16a34a" : "#ef4444" }]}>
                {t(item.result === "ok" ? "screens.stats.stats.stats.history.correct" : "screens.stats.stats.stats.history.wrong")}
              </Text>
            </View>
            {item.promptImageUri ? (
              <PromptImage uri={item.promptImageUri} imageStyle={styles.image} />
            ) : null}
            <Text style={styles.meta}>
              {t(`screens.stats.stats.stats.history.cardType.${item.cardType}`)}
              {item.userAnswer ? ` · ${formatUserAnswer(item, t)}` : ""}
            </Text>
            {item.promptText ? (
              <CardMathText
                text={`${item.promptText}${item.promptImageUri ? "" : " → ?"}`}
                textStyle={styles.prompt}
              />
            ) : null}
            {item.cardType !== "know_dont_know" ? (
              <View style={styles.expectedRow}>
                <Text style={styles.expected}>
                  {t("screens.stats.stats.stats.history.expected", { value: "" }).replace(/\s*$/, "")}
                </Text>
                <CardMathText text={item.expectedAnswerText} textStyle={styles.expected} />
              </View>
            ) : null}
            {item.expectedAnswerImageUri ? (
              <PromptImage
                uri={item.expectedAnswerImageUri}
                imageStyle={styles.image}
              />
            ) : null}
            <Text style={styles.meta}>
              {[item.courseName, t(`screens.stats.stats.stats.history.mode.${item.mode}`), `${formatBox(item.fromBox, t)} → ${formatBox(item.toBox, t)}`, new Date(item.createdAt).toLocaleString(), duration]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={42} color="#94a3b8" />
          <Text style={styles.emptyTitle}>{t("screens.stats.stats.stats.history.emptyTitle")}</Text>
          <Text style={styles.emptyText}>{t("screens.stats.stats.stats.history.emptyText")}</Text>
        </View>
      }
    />
  );
}
