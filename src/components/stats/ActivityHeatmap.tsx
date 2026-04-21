import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { useSettings } from "@/src/contexts/SettingsContext";

export type ActivityDay = {
  date: string;
  learnedCount: number;
  timeMs: number;
  correctCount: number;
  wrongCount: number;
  promotionsCount: number;
  totalCount: number;
};

type ActivityMonth = {
  key: string;
  label: string;
  days: ActivityDay[];
  totalTimeMs: number;
  totalLearnedCount: number;
  totalPromotionsCount: number;
};

type Props = {
  data: ActivityDay[];
  months?: number;
  onSelect?: (day: ActivityDay | null) => void;
};

type ScrambleTextProps = {
  text: string;
  animateKey: string;
  style?: StyleProp<TextStyle>;
  durationMs?: number;
};

const MONTH_NAMES = [
  "styczeń",
  "luty",
  "marzec",
  "kwiecień",
  "maj",
  "czerwiec",
  "lipiec",
  "sierpień",
  "wrzesień",
  "październik",
  "listopad",
  "grudzień",
] as const;

const SCRAMBLE_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const useStyles = createThemeStylesHook((colors) => ({
  container: {
    alignSelf: "stretch",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.headline,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.headline,
    textAlign: "right",
  },
  pager: {
    alignSelf: "stretch",
  },
  monthPage: {
    alignSelf: "stretch",
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignSelf: "stretch",
  },
  cell: {
    alignItems: "center",
    justifyContent: "center",
  },
  selectedCell: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: "700",
    includeFontPadding: false,
  },
  detailsWrap: {
    overflow: "hidden",
  },
  detailsCard: {
    marginTop: 14,
    marginBottom: 16,
    borderRadius: 18,
    padding: 16,
    backgroundColor: colors.secondBackground,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  detailsHeaderTextBlock: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.headline,
  },
  detailsSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.paragraph,
  },
  detailsBadge: {
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexShrink: 0,
  },
  detailsBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  detailsStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  detailsStat: {
    minWidth: "47%",
    flexGrow: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  detailsStatValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.headline,
  },
  detailsStatLabel: {
    marginTop: 4,
    fontSize: 12,
    color: colors.paragraph,
  },
}));

function formatLocalDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(date: string) {
  const [year, month, day] = date.split("-").map((value) => Number(value));
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatMonthLabel(date: Date) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDayLabel(date: string) {
  const parsed = parseLocalDate(date);
  return `${parsed.getDate()} ${MONTH_NAMES[parsed.getMonth()]} ${parsed.getFullYear()}`;
}

function formatDuration(ms: number) {
  if (ms <= 0) return "0 min";
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
}

function getScale(base: string, zero: string) {
  return [zero, `${base}22`, `${base}55`, `${base}88`, base];
}

function isScrambleChar(char: string) {
  return /[0-9A-Za-z\u00C0-\u024F]/.test(char);
}

function pickRandomChar() {
  const index = Math.floor(Math.random() * SCRAMBLE_CHARSET.length);
  return SCRAMBLE_CHARSET[index] ?? "0";
}

function buildTransitionFrame(
  source: string,
  target: string,
  scrambleProgress: number,
  resolveProgress: number
) {
  const sourceChars = source.split("");
  const targetChars = target.split("");
  const totalLength = Math.max(sourceChars.length, targetChars.length);
  const scrambleBoundary = Math.floor(scrambleProgress * totalLength);
  const resolveBoundary = Math.floor(resolveProgress * totalLength);
  const nextChars: string[] = [];

  for (let index = 0; index < totalLength; index += 1) {
    const sourceChar = sourceChars[index] ?? "";
    const targetChar = targetChars[index] ?? "";
    const isDynamic = isScrambleChar(sourceChar) || isScrambleChar(targetChar);
    const fallbackChar = targetChar || sourceChar;

    if (scrambleProgress < 1) {
      if (index >= scrambleBoundary) {
        nextChars.push(fallbackChar);
        continue;
      }

      nextChars.push(isDynamic ? pickRandomChar() : fallbackChar);
      continue;
    }

    if (index < resolveBoundary) {
      nextChars.push(targetChar);
      continue;
    }

    if (!isDynamic) {
      nextChars.push(fallbackChar);
      continue;
    }

    nextChars.push(pickRandomChar());
  }

  return nextChars.join("").replace(/\s+$/, "");
}

function ScrambleText({
  text,
  animateKey,
  style,
  durationMs,
}: ScrambleTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const previousTextRef = useRef(text);

  useEffect(() => {
    const previousText = previousTextRef.current;
    const hasAnyDynamicChar = [...`${previousText}${text}`].some((char) =>
      isScrambleChar(char)
    );

    if (!hasAnyDynamicChar || previousText === text) {
      setDisplayText(text);
      previousTextRef.current = text;
      return;
    }

    const totalDuration = durationMs ?? Math.max(520, Math.min(900, 320 + text.length * 26));
    const tickMs = 40;
    const start = Date.now();
    const scramblePhaseRatio = 0.45;

    setDisplayText(previousText);

    const intervalId = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.max(0, Math.min(1, elapsed / totalDuration));
      const scrambleProgress = Math.min(1, progress / scramblePhaseRatio);
      const resolveProgress =
        progress <= scramblePhaseRatio
          ? 0
          : Math.min(1, (progress - scramblePhaseRatio) / (1 - scramblePhaseRatio));

      if (progress >= 1) {
        setDisplayText(text);
        previousTextRef.current = text;
        clearInterval(intervalId);
        return;
      }

      setDisplayText(
        buildTransitionFrame(
          previousText,
          text,
          scrambleProgress,
          resolveProgress
        )
      );
    }, tickMs);

    return () => {
      clearInterval(intervalId);
      previousTextRef.current = text;
    };
  }, [animateKey, durationMs, text]);

  return <Text style={style}>{displayText}</Text>;
}

export default function ActivityHeatmap({ data, months = 12, onSelect }: Props) {
  const styles = useStyles();
  const { colors } = useSettings();
  const listRef = useRef<FlatList<ActivityMonth> | null>(null);
  const didInitScrollRef = useRef(false);
  const scale = useMemo(
    () => getScale(colors.my_green, colors.border),
    [colors.border, colors.my_green]
  );
  const [containerWidth, setContainerWidth] = useState(0);
  const [visibleMonthIndex, setVisibleMonthIndex] = useState(
    Math.max(0, months - 1)
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(() =>
    formatLocalDateOnly(new Date())
  );
  const [displayedDate, setDisplayedDate] = useState<string>(() =>
    formatLocalDateOnly(new Date())
  );

  const dataMap = useMemo(() => {
    const next = new Map<string, ActivityDay>();
    for (const item of data) {
      next.set(item.date, item);
    }
    return next;
  }, [data]);

  const maxTimeMs = useMemo(() => {
    let nextMax = 0;
    for (const item of data) {
      nextMax = Math.max(nextMax, item.timeMs);
    }
    return nextMax || 1;
  }, [data]);

  const monthsData = useMemo<ActivityMonth[]>(() => {
    const result: ActivityMonth[] = [];
    const today = new Date();

    for (let monthOffset = months - 1; monthOffset >= 0; monthOffset -= 1) {
      const monthDate = new Date(
        today.getFullYear(),
        today.getMonth() - monthOffset,
        1
      );
      const year = monthDate.getFullYear();
      const monthIndex = monthDate.getMonth();
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      const days: ActivityDay[] = [];

      for (let day = 1; day <= daysInMonth; day += 1) {
        const dateKey = formatLocalDateOnly(new Date(year, monthIndex, day));
        const entry = dataMap.get(dateKey);
        days.push(
          entry ?? {
            date: dateKey,
            learnedCount: 0,
            timeMs: 0,
            correctCount: 0,
            wrongCount: 0,
            promotionsCount: 0,
            totalCount: 0,
          }
        );
      }

      result.push({
        key: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
        label: formatMonthLabel(monthDate),
        days,
        totalTimeMs: days.reduce((sum, item) => sum + item.timeMs, 0),
        totalLearnedCount: days.reduce((sum, item) => sum + item.learnedCount, 0),
        totalPromotionsCount: days.reduce(
          (sum, item) => sum + item.promotionsCount,
          0
        ),
      });
    }

    return result;
  }, [dataMap, months]);

  const visibleMonth = monthsData[visibleMonthIndex] ?? monthsData[0] ?? null;
  const selectedDay = useMemo(() => {
    if (!selectedDate) return null;
    for (const month of monthsData) {
      const match = month.days.find((day) => day.date === selectedDate);
      if (match) return match;
    }
    return null;
  }, [monthsData, selectedDate]);

  const displayedDay = useMemo(() => {
    if (!displayedDate) return null;
    for (const month of monthsData) {
      const match = month.days.find((day) => day.date === displayedDate);
      if (match) return match;
    }
    return null;
  }, [displayedDate, monthsData]);

  useEffect(() => {
    if (!selectedDay) return;
    setDisplayedDate(selectedDay.date);
  }, [selectedDay]);

  useEffect(() => {
    if (!visibleMonth) {
      setDisplayedDate("");
      return;
    }

    const selectedDayInVisibleMonth =
      selectedDate &&
      visibleMonth.days.some((day) => day.date === selectedDate)
        ? selectedDate
        : null;
    const fallbackDay = visibleMonth.days[visibleMonth.days.length - 1]?.date ?? "";

    setDisplayedDate(selectedDayInVisibleMonth ?? fallbackDay);
  }, [selectedDate, visibleMonth]);

  useEffect(() => {
    if (!selectedDate) return;
    const stillExists = monthsData.some((month) =>
      month.days.some((day) => day.date === selectedDate)
    );
    if (!stillExists) {
      setSelectedDate(null);
      onSelect?.(null);
    }
  }, [monthsData, onSelect, selectedDate]);

  useEffect(() => {
    if (containerWidth <= 0 || didInitScrollRef.current || monthsData.length <= 1) {
      return;
    }

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
      didInitScrollRef.current = true;
    });
  }, [containerWidth, monthsData.length]);

  const pagePadding = 2;
  const cellGap = 8;
  const columns = 7;
  const pageWidth = Math.max(containerWidth, 1);
  const gridWidth = Math.max(pageWidth - pagePadding * 2, 1);
  const rawCellSize = (gridWidth - cellGap * (columns - 1)) / columns;
  const cellSize = Math.max(32, Math.min(46, Math.floor(rawCellSize)));
  const cellRadius = Math.max(8, Math.floor(cellSize / 3.2));
  const todayKey = formatLocalDateOnly(new Date());

  const pickColor = (timeMs: number) => {
    if (timeMs <= 0) return scale[0];
    const index = Math.min(4, Math.ceil((timeMs / maxTimeMs) * 4));
    return scale[index];
  };

  const handleDayPress = (day: ActivityDay) => {
    setSelectedDate(day.date);
    onSelect?.(day);
  };

  const handlePagerEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth <= 0) return;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    const safeIndex = Math.max(0, Math.min(monthsData.length - 1, nextIndex));
    setVisibleMonthIndex(safeIndex);
  };

  const animateKeyBase = displayedDay?.date ?? "details-empty";

  const renderMonth = ({ item }: { item: ActivityMonth }) => (
    <View style={[styles.monthPage, { width: pageWidth, paddingHorizontal: pagePadding }]}>
      <View style={styles.monthGrid}>
        {item.days.map((day, index) => {
          const isFuture = day.date > todayKey;
          const isSelected = selectedDate === day.date;
          const isLastColumn = (index + 1) % columns === 0;
          const lastRowStart = Math.floor((item.days.length - 1) / columns) * columns;
          const isLastRow = index >= lastRowStart;
          const isActive =
            !isFuture &&
            (day.timeMs > 0 || day.learnedCount > 0 || day.totalCount > 0);
          const backgroundColor = isFuture
            ? `${colors.border}66`
            : pickColor(day.timeMs);
          const textColor = isFuture
            ? colors.paragraph
            : isActive || isSelected
              ? colors.headline
              : colors.paragraph;

          return (
            <Pressable
              key={day.date}
              disabled={isFuture}
              onPress={() => handleDayPress(day)}
              style={[
                styles.cell,
                isSelected && styles.selectedCell,
                {
                  width: cellSize,
                  height: cellSize,
                  borderRadius: cellRadius,
                  marginRight: isLastColumn ? 0 : cellGap,
                  marginBottom: isLastRow ? 0 : cellGap,
                  backgroundColor,
                  borderWidth: isSelected ? 2 : 0,
                  borderColor: isSelected ? colors.my_green : "transparent",
                },
              ]}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    {
                      color: textColor,
                      opacity: isFuture ? 0.45 : isActive || isSelected ? 0.95 : 0.7,
                    },
                  ]}
                >
                {parseLocalDate(day.date).getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <View
      style={styles.container}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Ostatnia aktywność</Text>
        {visibleMonth ? (
          <View>
            <Text style={styles.monthLabel}>{visibleMonth.label}</Text>
          </View>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        data={monthsData}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.key}
        renderItem={renderMonth}
        onMomentumScrollEnd={handlePagerEnd}
        style={styles.pager}
      />

      <View
        pointerEvents={displayedDay ? "auto" : "none"}
        style={styles.detailsWrap}
      >
        {displayedDay ? (
          <View style={styles.detailsCard}>
            <View style={styles.detailsHeader}>
              <View style={styles.detailsHeaderTextBlock}>
                <ScrambleText
                  text={formatDayLabel(displayedDay.date)}
                  animateKey={`${animateKeyBase}-date`}
                  style={styles.detailsTitle}
                  durationMs={780}
                />
                <Text style={styles.detailsSubtitle}>
                  {displayedDay.totalCount > 0
                    ? "Szczegóły aktywności z wybranego dnia."
                    : "Tego dnia nie zapisano jeszcze aktywności."}
                </Text>
              </View>
              <View
                style={[
                  styles.detailsBadge,
                  {
                    backgroundColor:
                      displayedDay.timeMs > 0
                        ? `${colors.my_green}22`
                        : `${colors.my_red}18`,
                  },
                ]}
              >
                <ScrambleText
                  text={formatDuration(displayedDay.timeMs)}
                  animateKey={`${animateKeyBase}-time`}
                  style={[
                    styles.detailsBadgeText,
                    {
                      color: displayedDay.timeMs > 0 ? colors.my_green : colors.my_red,
                    },
                  ]}
                  durationMs={640}
                />
              </View>
            </View>

            <View style={styles.detailsStatsRow}>
              {[
                {
                  key: "promotions",
                  label: "Skoki",
                  value: String(displayedDay.promotionsCount),
                },
                {
                  key: "learned",
                  label: "Opanowane fiszki",
                  value: String(displayedDay.learnedCount),
                },
                {
                  key: "correct",
                  label: "Dobre odpowiedzi",
                  value: String(displayedDay.correctCount),
                },
                {
                  key: "wrong",
                  label: "Błędy",
                  value: String(displayedDay.wrongCount),
                },
              ].map((stat) => (
                <View
                  key={stat.key}
                  style={[
                    styles.detailsStat,
                    {
                      backgroundColor: `${colors.background}AA`,
                      borderColor: `${colors.border}CC`,
                    },
                  ]}
                >
                  <ScrambleText
                    text={stat.value}
                    animateKey={`${animateKeyBase}-${stat.key}`}
                    style={styles.detailsStatValue}
                    durationMs={560}
                  />
                  <Text style={styles.detailsStatLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
