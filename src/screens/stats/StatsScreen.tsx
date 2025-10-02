import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import StreakCard from "@/src/components/stats/StreakCard";
import DailyGoalCard from "@/src/components/stats/DailyGoalCard";
import DueReviewsCard from "@/src/components/stats/DueReviewsCard";
import LevelProgressCard from "@/src/components/stats/LevelProgressCard";
import AchievementsList from "@/src/components/stats/AchievementsList";
import { ACHIEVEMENTS } from "@/src/constants/achievements";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStreak } from "@/src/contexts/StreakContext";
import { countDueReviewsByLevel } from "@/src/db/sqlite/db";
import type { CEFRLevel } from "@/src/types/language";
import { useStyles } from "./StatsScreen-styles";

const LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function StatsScreen() {
  const styles = useStyles();
  const { activeProfile, dailyGoal, setDailyGoal } = useSettings();
  const { streakCount, lastDate, dailyProgressCount, achievements } =
    useStreak();

  const [dueReviews, setDueReviews] = useState<Record<CEFRLevel, number>>({
    A1: 0,
    A2: 0,
    B1: 0,
    B2: 0,
    C1: 0,
    C2: 0,
  });

  const refreshDueReviews = useCallback(async () => {
    if (
      !activeProfile ||
      activeProfile.sourceLangId == null ||
      activeProfile.targetLangId == null
    ) {
      setDueReviews({ A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 });
      return;
    }
    try {
      const counts = await countDueReviewsByLevel(
        activeProfile.sourceLangId,
        activeProfile.targetLangId,
        Date.now()
      );
      setDueReviews(counts);
    } catch (error) {
      console.warn("Nie udało się pobrać liczby powtórek", error);
      setDueReviews({ A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 });
    }
  }, [activeProfile]);

  useFocusEffect(
    useCallback(() => {
      void refreshDueReviews();
    }, [refreshDueReviews])
  );

  const achievementItems = useMemo(
    () =>
      ACHIEVEMENTS.map((item) => ({
        ...item,
        unlocked: Boolean(achievements[item.id]),
        unlockedAt: achievements[item.id]?.unlockedAt,
      })),
    [achievements]
  );

  if (
    !activeProfile ||
    activeProfile.sourceLangId == null ||
    activeProfile.targetLangId == null
  ) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Brak aktywnego profilu</Text>
        <Text style={styles.emptyText}>
          Stwórz profil w panelu profilu, aby śledzić statystyki nauki.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StreakCard
        streakCount={streakCount}
        lastDate={lastDate}
        dailyProgressCount={dailyProgressCount}
      />

      <DailyGoalCard
        dailyGoal={dailyGoal}
        currentCount={dailyProgressCount}
        onSave={setDailyGoal}
      />

      <DueReviewsCard dueReviews={dueReviews} />

      <View style={styles.grid}>
        {LEVELS.map((level) => (
          <View key={level} style={styles.columnCard}>
            <LevelProgressCard level={level} profile={activeProfile} />
          </View>
        ))}
      </View>

      <AchievementsList items={achievementItems} />
    </ScrollView>
  );
};
