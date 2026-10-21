import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import { useStyles } from "./StatsScreen-styles";
import { statsIconSizes } from "./statsDesign";
import { useNavbarStats } from "@/src/contexts/NavbarStatsContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import ActivityHeatmap, { type ActivityDay } from "@/src/components/stats/ActivityHeatmap";
import BigKnownWordsCard from "@/src/components/stats/BigKnownWordsCard";
// import MedalsShowcase from "@/src/components/stats/bookshelf";
import HardWordsList from "@/src/components/stats/HardWordsList";
import LearningTimeCard from "@/src/components/stats/HourlyActivityChart";
import PinnedCoursesProgress from "@/src/components/stats/PinnedCoursesProgress";
import {
  getDailyActivitySummariesCustom,
  getTotalLearningTimeMs,
} from "@/src/db/sqlite/db";
import { getProtectedDailyStreakState, MAX_STREAK_SHIELDS } from "@/src/services/streakProtection";
import { getRecentLearningHistory, type LearningHistoryEvent } from "@/src/db/sqlite/db";
import { SegmentedTabs } from "@/src/components/segmentedTabs/SegmentedTabs";
import LearningHistoryList from "@/src/components/stats/LearningHistoryList";

const SHIELD_SOURCE = require("@/assets/icons/tarcza.svg");
const SHIELD_BORDER_SOURCE = require("@/assets/icons/tarcza_border.svg");

function MiniStatGradient({ startColor, endColor }: { startColor: string; endColor: string }) {
  const gradientId = `mini-stat-${useId().replace(/:/g, "")}`;
  const [size, setSize] = useState({ width: 0, height: 0 });

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={({ nativeEvent: { layout } }) => {
        setSize((current) =>
          current.width === layout.width && current.height === layout.height
            ? current
            : { width: layout.width, height: layout.height }
        );
      }}
    >
      <Svg width={size.width} height={size.height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={startColor} />
            <Stop offset="100%" stopColor={endColor} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}

export default function StatsScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { statsBookshelfEnabled, colors, theme } = useSettings();
  const isDark = theme === "dark";
  const { stats } = useNavbarStats();
  const { isTabletLayout } = useDeviceLayout();
  const useCenteredTabletLayout = isTabletLayout;
  const [heatmapData, setHeatmapData] = useState<ActivityDay[]>([]);
  const [shieldedDates, setShieldedDates] = useState<string[]>([]);
  const [learningTime, setLearningTime] = useState({
    week: 0,
    month: 0,
    year: 0,
  });
  const [isBookshelfEditing, setIsBookshelfEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"stats" | "history">("stats");
  const [history, setHistory] = useState<LearningHistoryEvent[]>([]);
  const historyRequestId = useRef(0);

  const loadHistory = useCallback(async () => {
    const requestId = ++historyRequestId.current;

    try {
      const nextHistory = await getRecentLearningHistory();
      if (requestId !== historyRequestId.current) return;
      setHistory(nextHistory);
    } catch {
      if (requestId !== historyRequestId.current) return;
      setHistory([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (activeTab !== "history") return;

      void loadHistory();
      return () => {
        historyRequestId.current += 1;
      };
    }, [activeTab, loadHistory]),
  );

  useEffect(() => {
    if (!statsBookshelfEnabled) setIsBookshelfEditing(false);
  }, [statsBookshelfEnabled]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const start = new Date(end.getFullYear(), end.getMonth() - 11, 1);
      start.setHours(0, 0, 0, 0);
      try {
        const summaries = await getDailyActivitySummariesCustom(
          start.getTime(),
          end.getTime()
        );
        if (!mounted) return;
        setHeatmapData(summaries);
      } catch {
        if (mounted) {
          setHeatmapData([]);
          setShieldedDates([]);
        }
        return;
      }

      try {
        const streakProtection = await getProtectedDailyStreakState();
        if (!mounted) return;
        setShieldedDates(streakProtection.shieldUsedDates);
      } catch {
        if (mounted) {
          setShieldedDates([]);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const now = new Date();
    const end = now.getTime();

    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay(); // Sunday = 0, Monday = 1
    const diff = day === 0 ? -6 : 1 - day;
    startOfWeek.setDate(startOfWeek.getDate() + diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startOfYear = new Date(now);
    startOfYear.setMonth(0, 1);
    startOfYear.setHours(0, 0, 0, 0);

    (async () => {
      try {
        const [weekMs, monthMs, yearMs] = await Promise.all([
          getTotalLearningTimeMs(startOfWeek.getTime(), end),
          getTotalLearningTimeMs(startOfMonth.getTime(), end),
          getTotalLearningTimeMs(startOfYear.getTime(), end),
        ]);
        if (!mounted) return;
        setLearningTime({
          week: weekMs,
          month: monthMs,
          year: yearMs,
        });
      } catch {
        if (mounted) {
          setLearningTime({
            week: 0,
            month: 0,
            year: 0,
          });
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <SegmentedTabs
        options={[
          { key: "stats", label: t("screens.stats.stats.stats.history.tabs.stats") },
          { key: "history", label: t("screens.stats.stats.stats.history.tabs.history") },
        ]}
        value={activeTab}
        onChange={setActiveTab}
        accessibilityLabel={t("screens.stats.stats.stats.history.tabs.accessibilityLabel")}
        containerStyle={styles.tabs}
      />
      {activeTab === "stats" ? <ScrollView
        style={[styles.content, useCenteredTabletLayout && styles.contentTablet]}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={!isBookshelfEditing}
      >
        <BigKnownWordsCard />

        <View style={styles.miniStatsRow}>
          <View testID="streak-card" style={styles.miniStatItem}>
            <View style={styles.miniStatCard}>
              <MiniStatGradient
                startColor={colors.secondBackground}
                endColor={isDark ? "#352B40" : "#FFF0F5"}
              />
              <View
                style={[
                  styles.miniStatIconTile,
                  { backgroundColor: isDark ? "#4A3046" : "#FFE5ED" },
                ]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <MaterialIcons name="local-fire-department" size={statsIconSizes.metric} color={colors.my_red} />
              </View>
              <View style={styles.miniStatCopy}>
                <Text
                  testID="streak-value"
                  style={styles.miniStatValue}
                >
                  {stats.streakDays}
                </Text>
                <Text style={styles.miniStatLabel}>
                  {t("screens.stats.stats.stats.textChild.codziennaPassa")}
                </Text>
              </View>
              <View style={styles.miniStatShieldStack}>
                {Array.from({ length: MAX_STREAK_SHIELDS }, (_, index) => {
                  const owned = index < stats.shieldCount;
                  return (
                    <Image
                      key={index}
                      testID={owned ? `streak-shield-${index}` : `streak-shield-empty-${index}`}
                      source={owned ? SHIELD_SOURCE : SHIELD_BORDER_SOURCE}
                      contentFit="contain"
                      style={{ width: statsIconSizes.indicator, height: statsIconSizes.indicator }}
                    />
                  );
                })}
              </View>
            </View>
          </View>
          <View testID="jumps-card" style={styles.miniStatItem}>
            <View style={styles.miniStatCard}>
              <MiniStatGradient
                startColor={colors.secondBackground}
                endColor={isDark ? "#173D3E" : "#EAFBF7"}
              />
              <View
                style={[
                  styles.miniStatIconTile,
                  { backgroundColor: isDark ? "#184B49" : "#DDFBF5" },
                ]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Ionicons name="trending-up-outline" size={statsIconSizes.metric} color={colors.my_green} />
              </View>
              <View style={styles.miniStatCopy}>
                <Text
                  testID="jumps-value"
                  style={styles.miniStatValue}
                >
                  {stats.promotionsCount}
                </Text>
                <Text style={styles.miniStatLabel}>
                  {t("repeats.labels.jumps")}
                </Text>
              </View>
              <View
                style={styles.miniStatChart}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {[0.3, 0.5, 0.75, 1].map((ratio) => (
                  <View key={ratio} style={[styles.miniStatChartBar, { height: statsIconSizes.metric * ratio }]} />
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* {statsBookshelfEnabled && (
        <MedalsShowcase onEditModeChange={setIsBookshelfEditing} />
      )} */}

        <PinnedCoursesProgress />

        <ActivityHeatmap
          data={heatmapData}
          months={12}
          shieldedDates={shieldedDates}
        />

        <HardWordsList />

        <LearningTimeCard timeMs={learningTime} />
      </ScrollView> : <View style={[styles.historyContent, useCenteredTabletLayout && styles.contentTablet]}>
        <LearningHistoryList events={history} />
      </View>}
    </View>
  );
};
