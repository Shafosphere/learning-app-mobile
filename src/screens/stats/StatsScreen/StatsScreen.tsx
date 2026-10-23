import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import { useStyles } from "./StatsScreen-styles";
import { statsAccent, statsIconBackground, statsIconSizes } from "./statsDesign";
import { useNavbarStatsSnapshot } from "@/src/contexts/NavbarStatsContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import ActivityHeatmap, { type ActivityDay } from "@/src/components/stats/ActivityHeatmap";
import StatsSectionHeader from "@/src/components/stats/StatsSectionHeader";
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

const SHIELD_SOURCE = require("@/assets/ui/stats/shield.svg");
const SHIELD_BORDER_SOURCE = require("@/assets/ui/stats/shield-border.svg");

export default function StatsScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { statsBookshelfEnabled, colors } = useSettings();
  const accents = statsAccent(colors);
  const stats = useNavbarStatsSnapshot();
  const { isTabletLayout } = useDeviceLayout();
  const useCenteredTabletLayout = isTabletLayout;
  const [isActivityLoading, setIsActivityLoading] = useState(true);
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
      } finally {
        if (mounted) setIsActivityLoading(false);
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
        <View style={styles.section}>
          <StatsSectionHeader icon="trophy" title={t("screens.stats.stats.stats.sections.achievements")} />
          <BigKnownWordsCard />

          <View style={styles.miniStatsRow}>
            <View testID="streak-card" style={styles.miniStatItem}>
              <View style={styles.miniStatCard}>
                <View
                  style={[
                    styles.miniStatIconTile,
                    { backgroundColor: statsIconBackground(accents.streak) },
                  ]}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  <MaterialIcons name="local-fire-department" size={statsIconSizes.metric} color={accents.streak} />
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
                <View
                  style={[
                    styles.miniStatIconTile,
                    { backgroundColor: statsIconBackground(accents.progress) },
                  ]}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  <Ionicons name="trending-up-outline" size={statsIconSizes.metric} color={accents.progress} />
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
          isLoading={isActivityLoading}
          months={12}
          shieldedDates={shieldedDates}
        />

        <View style={styles.section}>
          <StatsSectionHeader
            icon="chart-line"
            title={t("screens.stats.stats.stats.sections.analysis")}
            subtitle={t("screens.stats.stats.stats.sections.analysisSubtitle")}
          />
          <HardWordsList />
          <LearningTimeCard timeMs={learningTime} />
        </View>
      </ScrollView> : <View style={[styles.historyContent, useCenteredTabletLayout && styles.contentTablet]}>
        <LearningHistoryList events={history} />
      </View>}
    </View>
  );
};
