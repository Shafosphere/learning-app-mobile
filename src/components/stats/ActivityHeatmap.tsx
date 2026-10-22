import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
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

type CalendarDayProps = {
  day: ActivityDay;
  selected: boolean;
  future: boolean;
  active: boolean;
  shielded: boolean;
  backgroundColor: string;
  headline: string;
  paragraph: string;
  accent: string;
  dark: boolean;
  size: number;
  radius: number;
  marginRight: number;
  marginBottom: number;
  styles: ReturnType<typeof useStyles>;
  onSelect: (day: ActivityDay) => void;
};

const CalendarDay = memo(function CalendarDay({
  day, selected, future, active, shielded, backgroundColor,
  headline, paragraph, accent, dark, size, radius,
  marginRight, marginBottom, styles, onSelect,
}: CalendarDayProps) {
  return (
    <Pressable
      testID={`activity-heatmap-day-${day.date}`}
      disabled={future}
      onPress={() => onSelect(day)}
      style={[
        styles.cell,
        {
          width: size,
          height: size,
          borderRadius: radius,
          marginRight,
          marginBottom,
          backgroundColor,
          borderWidth: selected ? 2 : 0,
          borderColor: selected ? accent : "transparent",
        },
      ]}
    >
      {shielded ? (
        <Image
          testID={`activity-heatmap-shield-${day.date}`}
          source={require("@/assets/icons/tarcza.svg")}
          contentFit="contain"
          style={{
            position: "absolute",
            width: Math.round(size * 0.82),
            height: Math.round(size * 0.82),
            opacity: dark ? 0.34 : 0.28,
          }}
        />
      ) : null}
      <Text
        style={[
          styles.dayNumber,
          {
            color: !future && (active || selected) ? headline : paragraph,
            opacity: future ? 0.45 : active || selected ? 0.95 : 0.7,
          },
        ]}
      >
        {parseLocalDate(day.date).getDate()}
      </Text>
    </Pressable>
  );
});

type CalendarMonthProps = {
  month: ActivityMonth;
  selectedDate: string | null;
  todayKey: string;
  shieldedDates: Set<string>;
  scale: string[];
  maxTimeMs: number;
  pageWidth: number;
  columns: number;
  cellSize: number;
  cellRadius: number;
  colors: ReturnType<typeof useSettings>["colors"];
  dark: boolean;
  styles: ReturnType<typeof useStyles>;
  onSelect: (day: ActivityDay) => void;
};

const PAGE_PADDING = 2;
const CELL_GAP = 8;
const monthKeyExtractor = (month: ActivityMonth) => month.key;

const CalendarMonth = memo(function CalendarMonth({
  month, selectedDate, todayKey, shieldedDates, scale, maxTimeMs,
  pageWidth, columns, cellSize, cellRadius, colors, dark, styles, onSelect,
}: CalendarMonthProps) {
  const lastRowStart = Math.floor((month.days.length - 1) / columns) * columns;
  return (
    <View
      testID={`activity-heatmap-month-${month.key}`}
      style={[styles.monthPage, { width: pageWidth, paddingHorizontal: PAGE_PADDING }]}
    >
      <View style={styles.monthGrid}>
        {month.days.map((day, index) => {
          const future = day.date > todayKey;
          const active = !future &&
            (day.timeMs > 0 || day.learnedCount > 0 || day.totalCount > 0);
          const colorIndex = day.timeMs <= 0
            ? 0
            : Math.min(4, Math.ceil((day.timeMs / maxTimeMs) * 4));
          return (
            <CalendarDay
              key={day.date}
              day={day}
              selected={selectedDate === day.date}
              future={future}
              active={active}
              shielded={shieldedDates.has(day.date) && !active && !future}
              backgroundColor={future ? withAlpha(colors.border, "66") : scale[colorIndex]}
              headline={colors.headline}
              paragraph={colors.paragraph}
              accent={colors.my_green}
              dark={dark}
              size={cellSize}
              radius={cellRadius}
              marginRight={(index + 1) % columns === 0 ? 0 : CELL_GAP}
              marginBottom={index >= lastRowStart ? 0 : CELL_GAP}
              styles={styles}
              onSelect={onSelect}
            />
          );
        })}
      </View>
    </View>
  );
});

function ActivityHeatmap({
  data,
  months = 12,
  shieldedDates,
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
  const previousWidthRef = useRef(0);
  const scale = useMemo(
    () => getScale(colors.my_green, colors.border, theme === "dark"),
    [colors.border, colors.my_green, theme]
  );
  const shieldedDateSet = useMemo(
    () => new Set(shieldedDates),
    [shieldedDates]
  );
  const [containerWidth, setContainerWidth] = useState(0);
  const [todayKey, setTodayKey] = useState(() => formatLocalDateOnly(new Date()));

  useEffect(() => {
    let midnightTimeout: ReturnType<typeof setTimeout>;

    const refreshDate = () => {
      clearTimeout(midnightTimeout);
      const now = new Date();
      setTodayKey(formatLocalDateOnly(now));
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      midnightTimeout = setTimeout(refreshDate, nextMidnight.getTime() - now.getTime());
    };

    refreshDate();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshDate();
    });

    return () => {
      clearTimeout(midnightTimeout);
      subscription.remove();
    };
  }, []);

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
    const today = parseLocalDate(todayKey);

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
  }, [dataMap, months, t, todayKey]);

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
    // Initial positioning belongs to FlatList; only real resizes need correction.
    if (previousWidthRef.current > 0 && previousWidthRef.current !== containerWidth) {
      listRef.current?.scrollToOffset({
        offset: visibleMonthIndex * containerWidth,
        animated: false,
      });
    }
    previousWidthRef.current = containerWidth;
  }, [containerWidth, visibleMonthIndex]);

  const pageWidth = Math.max(containerWidth, 1);
  const gridWidth = Math.max(pageWidth - PAGE_PADDING * 2, 1);
  const rawCellSize = (gridWidth - CELL_GAP * 6) / 7;
  const baseCellSize = Math.max(32, Math.min(46, Math.floor(rawCellSize)));
  const targetCellSize = baseCellSize * CALENDAR_SCALE;
  const columns = Math.max(
    1,
    Math.round((gridWidth + CELL_GAP) / (targetCellSize + CELL_GAP))
  );
  // Distribute the available width across the row, rounding down to avoid wrapping.
  const cellSize = Math.floor(
    ((gridWidth - CELL_GAP * (columns - 1)) / columns) * 100
  ) / 100;
  const cellRadius = Math.max(8, Math.floor(cellSize / 3.2));

  const handleDayPress = useCallback((day: ActivityDay) => {
    setSelectedDate(day.date);
    onSelect?.(day);
  }, [onSelect]);

  const getItemLayout = useCallback((_: ArrayLike<ActivityMonth> | null | undefined, index: number) => ({
    length: pageWidth,
    offset: index * pageWidth,
    index,
  }), [pageWidth]);

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

  const renderMonth = useCallback(({ item }: { item: ActivityMonth }) => (
    <CalendarMonth
      month={item}
      selectedDate={selectedDate?.startsWith(`${item.key}-`) ? selectedDate : null}
      todayKey={todayKey}
      shieldedDates={shieldedDateSet}
      scale={scale}
      maxTimeMs={maxTimeMs}
      pageWidth={pageWidth}
      columns={columns}
      cellSize={cellSize}
      cellRadius={cellRadius}
      colors={colors}
      dark={theme === "dark"}
      styles={styles}
      onSelect={handleDayPress}
    />
  ), [selectedDate, todayKey, shieldedDateSet, scale, maxTimeMs, pageWidth,
    columns, cellSize, cellRadius, colors, theme, styles, handleDayPress]);

  return (
    <View
      testID="activity-heatmap"
      style={styles.container}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        if (width > 0) setContainerWidth(width);
      }}
    >
      <View style={styles.section}>
        <StatsSectionHeader
          title={t("components.stats.activityHeatmap.textChild.ostatniaAktywnosc")}
          metadata={visibleMonth?.label}
        />

        {containerWidth > 0 && <FlatList
          testID="activity-heatmap-pager"
          ref={listRef}
          data={monthsData}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          keyExtractor={monthKeyExtractor}
          getItemLayout={getItemLayout}
          initialScrollIndex={Math.max(0, monthsData.length - 1)}
          // One month fills the viewport; retain neighbors for fast paging.
          initialNumToRender={1}
          windowSize={5}
          renderItem={renderMonth}
          onMomentumScrollEnd={handlePagerEnd}
          style={styles.pager}
        />}
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

export default memo(ActivityHeatmap);
