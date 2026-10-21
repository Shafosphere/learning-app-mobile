import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextStyle,
  type TextProps,
} from "react-native";
import StatsSectionHeader from "./StatsSectionHeader";
import MyButton from "@/src/components/button/button";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { useSettings } from "@/src/contexts/SettingsContext";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import {
  statsIconSizes,
  statsMetricStyles,
  statsSectionStyles,
  statsTypography,
} from "@/src/screens/stats/StatsScreen/statsDesign";

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
  shieldedDates?: string[];
  onSelect?: (day: ActivityDay | null) => void;
};

type ScrambleTextProps = Pick<
  TextProps,
  "numberOfLines" | "adjustsFontSizeToFit" | "minimumFontScale" | "accessibilityRole"
> & {
  text: string;
  animateKey: string;
  style?: StyleProp<TextStyle>;
  durationMs?: number;
  preserveLayout?: boolean;
};

const SCRAMBLE_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CALENDAR_SCALE = 1.5;
const scrambleStyles = StyleSheet.create({
  reference: { opacity: 0 },
  overlay: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
});

const useStyles = createThemeStylesHook((colors, accessibility) => ({
  container: {
    ...statsSectionStyles.list,
    alignSelf: "stretch",
  },
  section: {
    ...statsSectionStyles.section,
  },
  pager: {
    alignSelf: "stretch",
  },
  monthNavigation: {
    flexDirection: "row",
    gap: 12,
  },
  monthNavigationButton: {
    flex: 1,
    minWidth: 0,
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
    overflow: "hidden",
  },
  dayNumber: {
    fontSize: 15 * CALENDAR_SCALE,
    fontWeight: "700",
    includeFontPadding: false,
    zIndex: 1,
  },
  detailsWrap: {
    alignSelf: "stretch",
  },
  detailsCard: {
    ...statsSectionStyles.section,
  },
  detailsHeader: {
    gap: 4,
  },
  detailsTitle: {
    ...statsTypography.sectionTitle,
    color: colors.headline,
  },
  detailsDescription: {
    ...statsTypography.description,
    color: colors.paragraph,
  },
  detailsStatsGrid: {
    ...statsMetricStyles.list,
  },
  detailsStat: {
    ...statsMetricStyles.card,
    borderWidth: accessibility.highContrastEnabled ? 1 : 0,
    borderColor: colors.border,
  },
  detailsStatIcon: {
    ...statsMetricStyles.iconContainer,
  },
  detailsStatCopy: {
    ...statsMetricStyles.copy,
  },
  detailsStatValue: {
    ...statsTypography.metricValue,
    color: colors.headline,
  },
  detailsStatLabel: {
    ...statsTypography.metricLabel,
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

function getMonthName(monthIndex: number, t: TFunction) {
  return t(`components.stats.activityHeatmap.months.${monthIndex}`);
}

function formatMonthLabel(date: Date, t: TFunction) {
  return `${getMonthName(date.getMonth(), t)} ${date.getFullYear()}`;
}

function formatDayLabel(date: string, t: TFunction) {
  const parsed = parseLocalDate(date);
  return `${parsed.getDate()} ${getMonthName(parsed.getMonth(), t)} ${parsed.getFullYear()}`;
}

function withAlpha(color: string, alpha: string) {
  if (/^#[0-9A-Fa-f]{8}$/.test(color)) {
    return `${color.slice(0, 7)}${alpha}`;
  }

  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return `${color}${alpha}`;
  }

  return color;
}

function getScale(base: string, zero: string, isDarkTheme: boolean) {
  const activeAlphas = isDarkTheme
    ? ["66", "88", "AA", "CC"]
    : ["38", "66", "99", "FF"];

  return [
    zero,
    withAlpha(base, activeAlphas[0]),
    withAlpha(base, activeAlphas[1]),
    withAlpha(base, activeAlphas[2]),
    withAlpha(base, activeAlphas[3]),
  ];
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
  preserveLayout = false,
  ...textProps
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

  if (preserveLayout) {
    return (
      <View accessible accessibilityLabel={text} accessibilityRole={textProps.accessibilityRole}>
        <Text
          {...textProps}
          style={[style, scrambleStyles.reference]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {text}
        </Text>
        <View
          style={scrambleStyles.overlay}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text {...textProps} style={style}>{displayText}</Text>
        </View>
      </View>
    );
  }

  return <Text {...textProps} style={style}>{displayText}</Text>;
}

export default function ActivityHeatmap({
  data,
  months = 12,
  shieldedDates = [],
  onSelect,
}: Props) {
  const styles = useStyles();
  const { t } = useTranslation();
  const {
    colors,
    theme,
    accessibilityPreferences,
  } = useSettings();
  const listRef = useRef<FlatList<ActivityMonth> | null>(null);
  const didInitScrollRef = useRef(false);
  const scale = useMemo(
    () => getScale(colors.my_green, colors.border, theme === "dark"),
    [colors.border, colors.my_green, theme]
  );
  const shieldedDateSet = useMemo(
    () => new Set(shieldedDates),
    [shieldedDates]
  );
  const [containerWidth, setContainerWidth] = useState(0);
  const highContrast = accessibilityPreferences.highContrastEnabled;
  const useThemeAccents = theme === "dark" || highContrast ||
    (accessibilityPreferences.colorBlindMode ?? "none") !== "none";
  const useThemeText = theme === "dark" || highContrast;
  const detailsColors = {
    headline: useThemeText ? colors.headline : "#0B1757",
    paragraph: useThemeText ? colors.paragraph : "#6379A6",
    tile: useThemeText ? colors.secondBackground : "#FFFFFF",
    turquoise: useThemeAccents ? colors.my_green : "#00CDB8",
    pink: useThemeAccents ? colors.my_red : "#FF5470",
    green: useThemeAccents ? colors.my_green : "#00C878",
    red: useThemeAccents ? colors.my_red : "#FF3159",
  };
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
        label: formatMonthLabel(monthDate, t),
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
  }, [dataMap, months, t]);

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
  const pageWidth = Math.max(containerWidth, 1);
  const gridWidth = Math.max(pageWidth - pagePadding * 2, 1);
  const rawCellSize = (gridWidth - cellGap * 6) / 7;
  const baseCellSize = Math.max(32, Math.min(46, Math.floor(rawCellSize)));
  const targetCellSize = baseCellSize * CALENDAR_SCALE;
  const columns = Math.max(
    1,
    Math.round((gridWidth + cellGap) / (targetCellSize + cellGap))
  );
  // Distribute the available width across the row, rounding down to avoid wrapping.
  const cellSize = Math.floor(
    ((gridWidth - cellGap * (columns - 1)) / columns) * 100
  ) / 100;
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

  const changeMonth = (direction: -1 | 1) => {
    if (containerWidth <= 0) return;
    const nextIndex = Math.max(
      0,
      Math.min(monthsData.length - 1, visibleMonthIndex + direction)
    );
    if (nextIndex === visibleMonthIndex) return;
    listRef.current?.scrollToOffset({ offset: nextIndex * pageWidth, animated: true });
    setVisibleMonthIndex(nextIndex);
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
          const isShielded =
            shieldedDateSet.has(day.date) && !isActive && !isFuture;
          const backgroundColor = isFuture
            ? withAlpha(colors.border, "66")
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
                {isShielded ? (
                  <Image
                    testID={`activity-heatmap-shield-${day.date}`}
                    source={require("@/assets/icons/tarcza.svg")}
                    contentFit="contain"
                    style={{
                      position: "absolute",
                      width: Math.round(cellSize * 0.82),
                      height: Math.round(cellSize * 0.82),
                      opacity: theme === "dark" ? 0.34 : 0.28,
                    }}
                  />
                ) : null}
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
      testID="activity-heatmap"
      style={styles.container}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <View style={styles.section}>
        <StatsSectionHeader
          title={t("components.stats.activityHeatmap.textChild.ostatniaAktywnosc")}
          metadata={visibleMonth?.label}
        />

        <FlatList
          testID="activity-heatmap-pager"
          ref={listRef}
          data={monthsData}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          keyExtractor={(item) => item.key}
          getItemLayout={(_, index) => ({ length: pageWidth, offset: index * pageWidth, index })}
          renderItem={renderMonth}
          onMomentumScrollEnd={handlePagerEnd}
          style={styles.pager}
        />
        <View style={styles.monthNavigation}>
          <MyButton
            accessibilityLabel={t("components.stats.activityHeatmap.navigation.previousMonth")}
            color="my_yellow"
            onPress={() => changeMonth(-1)}
            disabled={containerWidth <= 0 || visibleMonthIndex <= 0}
            autoWidth
            style={styles.monthNavigationButton}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.headline}
              style={{ opacity: containerWidth <= 0 || visibleMonthIndex <= 0 ? 0.35 : 1 }}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          </MyButton>
          <MyButton
            accessibilityLabel={t("components.stats.activityHeatmap.navigation.nextMonth")}
            color="my_yellow"
            onPress={() => changeMonth(1)}
            disabled={containerWidth <= 0 || visibleMonthIndex >= monthsData.length - 1}
            autoWidth
            style={styles.monthNavigationButton}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={colors.headline}
              style={{ opacity: containerWidth <= 0 || visibleMonthIndex >= monthsData.length - 1 ? 0.35 : 1 }}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          </MyButton>
        </View>
      </View>

      <View
        pointerEvents={displayedDay ? "auto" : "none"}
        style={styles.detailsWrap}
      >
        {displayedDay ? (
          <View style={styles.detailsCard}>
            <View style={styles.detailsHeader}>
              <ScrambleText
                text={formatDayLabel(displayedDay.date, t)}
                animateKey={`${animateKeyBase}-title`}
                style={styles.detailsTitle}
                accessibilityRole="header"
                preserveLayout
              />
              <ScrambleText
                text={displayedDay.totalCount > 0
                  ? t("components.stats.activityHeatmap.details.selectedDayActivity")
                  : t("components.stats.activityHeatmap.details.noActivityForDay")}
                animateKey={`${animateKeyBase}-subtitle`}
                style={styles.detailsDescription}
                preserveLayout
              />
            </View>

            <View
              testID="activity-details-grid"
              style={styles.detailsStatsGrid}
            >
              {[
                {
                  key: "promotions",
                  label: t("repeats.labels.jumps"),
                  value: String(displayedDay.promotionsCount),
                  icon: "trending-up-outline" as const,
                  color: detailsColors.turquoise,
                },
                {
                  key: "learned",
                  label: t("repeats.labels.knownFlashcards"),
                  value: String(displayedDay.learnedCount),
                  icon: "flame" as const,
                  color: detailsColors.pink,
                },
                {
                  key: "correct",
                  label: t("components.stats.activityHeatmap.stats.correct"),
                  value: String(displayedDay.correctCount),
                  icon: "shield-checkmark" as const,
                  color: detailsColors.green,
                },
                {
                  key: "wrong",
                  label: t("components.stats.activityHeatmap.stats.wrong"),
                  value: String(displayedDay.wrongCount),
                  icon: "close" as const,
                  color: detailsColors.red,
                },
                {
                  key: "time",
                  label: t("components.stats.activityHeatmap.stats.minutes"),
                  value: String(Math.max(0, Math.round(displayedDay.timeMs / 60000))),
                  icon: "stopwatch-outline" as const,
                  color: detailsColors.turquoise,
                },
              ].map((stat) => (
                <View
                  key={stat.key}
                  testID={`activity-details-stat-${stat.key}`}
                  style={[
                    styles.detailsStat,
                    { backgroundColor: detailsColors.tile },
                  ]}
                >
                  <View
                    style={[
                      styles.detailsStatIcon,
                      { backgroundColor: withAlpha(stat.color, theme === "dark" ? "2E" : "18") },
                    ]}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  >
                    <Ionicons name={stat.icon} size={statsIconSizes.metric} color={stat.color} />
                  </View>
                  <View style={styles.detailsStatCopy}>
                    <ScrambleText
                      text={stat.value}
                      animateKey={`${animateKeyBase}-${stat.key}`}
                      style={[styles.detailsStatValue, { color: detailsColors.headline }]}
                      durationMs={560}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    />
                    <Text style={[styles.detailsStatLabel, { color: detailsColors.paragraph }]}>
                      {stat.label}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
