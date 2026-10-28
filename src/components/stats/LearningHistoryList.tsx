import { statsTileStyle } from "./statsTileStyle";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo } from "react";
import { FlatList, Image, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import type { LearningHistoryEvent } from "@/src/db/sqlite/db";
import { resolveCourseIconProps } from "@/src/constants/customCourse";
import { PromptImage } from "@/src/components/card/subcomponents/PromptImage";
import { CardMathText } from "@/src/components/card/subcomponents/CardMathText";
import { useSettings } from "@/src/contexts/SettingsContext";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

const useStyles = createThemeStylesHook((colors) => ({
  list: { padding: 16, paddingTop: 4, gap: 10 },
  listLandscape: { paddingHorizontal: 32 },
  eventsRow: { flexDirection: "row", alignItems: "stretch", gap: 16 },
  eventColumn: { flex: 1, minWidth: 0 },
  item: {
    ...statsTileStyle,
    padding: 16,
    backgroundColor: colors.secondBackground,
    gap: 8,
  },
  statusRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 8,
  },
  statusGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  result: { fontSize: 14, fontWeight: "800" as const, flexShrink: 1 },
  detailsGroup: {
    flexShrink: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "flex-end" as const,
    gap: 8,
  },
  timeGroup: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    flexShrink: 1,
  },
  time: { color: colors.paragraph, fontSize: 12, flexShrink: 1 },
  prompt: {
    color: colors.headline,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700" as const,
  },
  content: { gap: 8 },
  image: { width: "100%" as const, height: 100 },
  courseIcon: { width: 16, height: 16, resizeMode: "contain" as const },
  metadataRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 6,
  },
  metadataStack: { flex: 1, minWidth: 0 },
  metadataTopRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 8,
  },
  metaCourse: {
    color: colors.paragraph,
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.75,
    flex: 1,
    minWidth: 0,
  },
  metaBox: {
    color: colors.paragraph,
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.75,
    flexShrink: 0,
    textAlign: "right" as const,
  },
  metaDuration: {
    color: colors.paragraph,
    fontSize: 11,
    lineHeight: 15,
    opacity: 0.6,
    textAlign: "right" as const,
  },
  empty: { padding: 32, alignItems: "center" as const, gap: 10 },
  emptyTitle: { color: colors.headline, fontSize: 20, fontWeight: "700" as const },
  emptyText: { color: colors.paragraph, fontSize: 14, textAlign: "center" as const },
  dayHeader: {
    marginTop: 16,
    marginBottom: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 7,
  },
  dayDate: { color: colors.headline, fontSize: 16, fontWeight: "800" as const },
  dayToday: { color: colors.headline, fontSize: 14 },
  dayHeaderLine: {
    flex: 1,
    borderBottomWidth: 4,
    borderStyle: "dashed" as const,
    borderColor: colors.border,
    marginLeft: 5,
  },
}));

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

function formatDuration(
  durationMs: number | null,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (durationMs == null) return null;
  return t("screens.stats.stats.stats.history.seconds", {
    value: (durationMs / 1000).toFixed(1),
  });
}

function getLocalDayKey(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDay(timestamp: number, locale: string) {
  return new Date(timestamp).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(timestamp: number, locale: string) {
  return new Date(timestamp).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isToday(timestamp: number) {
  return getLocalDayKey(timestamp) === getLocalDayKey(Date.now());
}

type HistoryRow =
  | { kind: "day"; key: string; timestamp: number }
  | { kind: "events"; key: string; events: LearningHistoryEvent[] };

export default function LearningHistoryList({
  events,
  columns = 1,
}: {
  events: LearningHistoryEvent[];
  columns?: 1 | 2;
}) {
  const styles = useStyles();
  const { colors } = useSettings();
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";

  const rows = useMemo(() => {
    const next: HistoryRow[] = [];
    let previousDay: string | null = null;
    let currentRow: Extract<HistoryRow, { kind: "events" }> | null = null;
    for (const event of events) {
      const day = getLocalDayKey(event.createdAt);
      if (day !== previousDay) {
        next.push({ kind: "day", key: `day-${event.id}`, timestamp: event.createdAt });
        currentRow = null;
        previousDay = day;
      }
      if (!currentRow || currentRow.events.length === columns) {
        currentRow = { kind: "events", key: `events-${event.id}`, events: [] };
        next.push(currentRow);
      }
      currentRow.events.push(event);
    }
    return next;
  }, [events, columns]);

  const renderEvent = (item: LearningHistoryEvent) => (
    <View style={styles.item}>
      <View style={styles.statusRow}>
        <View style={styles.statusGroup}>
          <Ionicons
            name={item.result === "ok" ? "checkmark-circle" : "close-circle"}
            size={20}
            color={item.result === "ok" ? colors.my_green : colors.my_red}
          />
          <Text style={[styles.result, { color: item.result === "ok" ? colors.my_green : colors.my_red }]}>
            {t(item.result === "ok" ? "screens.stats.stats.stats.history.correct" : "screens.stats.stats.stats.history.wrong")}
          </Text>
        </View>
        <View style={styles.detailsGroup}>
          <View style={styles.timeGroup}>
            <Ionicons name="time-outline" size={14} color={colors.paragraph} />
            <Text style={styles.time}>{formatTime(item.createdAt, locale)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.content}>
        {item.promptText ? <CardMathText text={item.promptText} textStyle={styles.prompt} /> : null}
        {item.promptImageUri ? <PromptImage uri={item.promptImageUri} imageStyle={styles.image} /> : null}
        {item.expectedAnswerImageUri ? <PromptImage uri={item.expectedAnswerImageUri} imageStyle={styles.image} /> : null}
      </View>
      <View style={styles.metadataRow}>
        {(() => {
          const courseIcon = resolveCourseIconProps(
            item.iconId ?? "book",
            item.iconColor ?? colors.paragraph,
          );
          if (courseIcon.mainImageSource) {
            return <Image source={courseIcon.mainImageSource} style={styles.courseIcon} />;
          }
          const CourseIcon = courseIcon.icon.Component;
          return (
            <CourseIcon
              name={courseIcon.icon.name as never}
              size={16}
              color={courseIcon.icon.color}
            />
          );
        })()}
        <View style={styles.metadataStack}>
          <View style={styles.metadataTopRow}>
            {item.courseName ? <Text style={styles.metaCourse}>{item.courseName}</Text> : null}
            <View>
              {item.fromBox || item.toBox ? (
                <Text style={styles.metaBox}>
                  {`${formatBox(item.fromBox, t)} → ${formatBox(item.toBox, t)}`}
                </Text>
              ) : null}
              {formatDuration(item.durationMs, t) ? (
                <Text style={styles.metaDuration}>{formatDuration(item.durationMs, t)}</Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => row.key}
      contentContainerStyle={events.length ? [styles.list, columns === 2 && styles.listLandscape] : undefined}
      renderItem={({ item: row }) => row.kind === "day" ? (
        <View style={[styles.dayHeader, { marginBottom: 2 }]}>
          <Ionicons name="calendar-outline" size={16} color={colors.headline} />
          <Text>
            <Text style={styles.dayDate}>{formatDay(row.timestamp, locale)}</Text>
            {isToday(row.timestamp) ? <Text style={styles.dayToday}> {t("screens.stats.stats.stats.history.today")}</Text> : null}
          </Text>
          <View style={styles.dayHeaderLine} />
        </View>
      ) : (
        <View style={styles.eventsRow} testID={`history-row-${row.events[0].id}`}>
          {row.events.map((event) => (
            <View key={event.id} style={styles.eventColumn}>{renderEvent(event)}</View>
          ))}
          {columns === 2 && row.events.length === 1 ? (
            <View style={styles.eventColumn} accessible={false} />
          ) : null}
        </View>
      )}
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
