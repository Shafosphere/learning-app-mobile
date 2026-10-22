import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { Image, Text, View } from "react-native";
import StatsProgressCard from "./StatsProgressCard";
import StatsProgressList, { STATS_PROGRESS_VISIBLE_ROWS } from "./StatsProgressList";
import StatsProgressRow, { StatsProgressRowSkeleton } from "./StatsProgressRow";
import StatsSectionHeader from "./StatsSectionHeader";
import { resolveCourseIconProps } from "@/src/constants/customCourse";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  getCustomCourseMasteryProgress,
  getCustomCoursesWithCardCounts,
} from "@/src/db/sqlite/db";
import { useTranslation } from "react-i18next";
import { statsAccent, statsIconBackgrounds, statsIconSizes, statsMetricStyles, statsProgressStyles, statsTypography } from "@/src/screens/stats/StatsScreen/statsDesign";

type Item = {
  key: string;
  label: string;
  iconId: string;
  iconColor: string;
  learned: number;
  total: number;
  progress: number; // 0..1
};

const SKELETON_ROWS = STATS_PROGRESS_VISIBLE_ROWS;

const useStyles = createThemeStylesHook((colors) => ({
  wrapper: {
    ...statsProgressStyles.wrapper,
  },
  iconTile: {
    ...statsMetricStyles.iconContainer,
  },
  courseImage: {
    width: statsIconSizes.metric,
    height: statsIconSizes.metric,
    resizeMode: "contain",
  },
  empty: {
    ...statsTypography.description,
    color: colors.paragraph,
    padding: 16,
  },
}));

export default function PinnedCoursesProgress() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { activeCustomCourseId, pinnedOfficialCourseIds, colors } = useSettings();
  const accents = statsAccent(colors);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setIsLoading(true);

      (async () => {
        try {
          const allCourses = await getCustomCoursesWithCardCounts();
          const officialPinned = new Set(pinnedOfficialCourseIds);
          const eligible = allCourses.filter((course) => {
            if (!course.reviewsEnabled) return false;
            if (course.isOfficial) {
              return (
                officialPinned.has(course.id) ||
                course.id === activeCustomCourseId
              );
            }
            return true;
          });

          const results = await Promise.all(
            eligible.map(async (course) => {
              const mastery = await getCustomCourseMasteryProgress(course.id);
              const total = course.cardsCount ?? 0;
              const learned = Math.min(total, mastery.completedCardsCount);
              return {
                key: course.id.toString(),
                label: course.name,
                iconId: course.iconId,
                iconColor: course.iconColor,
                learned,
                total,
                progress: total > 0 ? Math.min(1, learned / total) : 0,
              };
            })
          );
          const sortedResults = results.sort(
            (a, b) => b.progress - a.progress || a.label.localeCompare(b.label)
          );

          if (!mounted) return;
          setItems(sortedResults);
          setIsLoading(false);
        } catch {
          if (!mounted) return;
          setItems([]);
          setIsLoading(false);
        }
      })();
      return () => {
        mounted = false;
      };
    }, [activeCustomCourseId, pinnedOfficialCourseIds])
  );

  return (
    <View style={styles.wrapper}>
      <StatsSectionHeader
        icon="book-open"
        title={t("screens.stats.stats.stats.sections.courses")}
        subtitle={t("components.stats.pinnedCoursesProgress.title.postepPrzypietychKursow")}
      />
      <StatsProgressCard>
        {isLoading ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <StatsProgressRowSkeleton key={index} index={index} isLast={index === SKELETON_ROWS - 1} />
            ))}
          </View>
        ) : items.length === 0 ? (
          <Text style={styles.empty}>
            {t("components.stats.pinnedCoursesProgress.textChild.brakDanychDoWyswietlenia")}
          </Text>
        ) : (
          <StatsProgressList
            testID="pinned-courses-progress-list"
            items={items}
            keyExtractor={(item) => item.key}
            renderItem={(it, _index, layout) => {
              const iconProps = resolveCourseIconProps(
                it.iconId,
                it.iconColor ?? colors.headline
              );
              const CourseIcon = iconProps.icon.Component;
              const percent = Math.round(it.progress * 100);

              return (
                <StatsProgressRow
                  {...layout}
                  testID={`pinned-course-row-${it.key}`}
                  title={it.label}
                  label={t("components.stats.pinnedCoursesProgress.label.valueValue", {
                    learned: it.learned,
                    total: it.total,
                  })}
                  value={t("components.stats.progressBar.textChildTemplate.value", { value: percent })}
                  progress={it.progress}
                  progressColor={accents.progress}
                  progressLabel={it.label}
                  trackTestID={`pinned-course-progress-${it.key}`}
                  fillTestID={`pinned-course-fill-${it.key}`}
                  icon={(
                    <View
                      style={[
                        styles.iconTile,
                        { backgroundColor: statsIconBackgrounds[Number(it.key) % statsIconBackgrounds.length] },
                      ]}
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    >
                      {iconProps.mainImageSource ? (
                        <Image source={iconProps.mainImageSource} style={styles.courseImage} />
                      ) : (
                        <CourseIcon
                          name={iconProps.icon.name as never}
                          size={statsIconSizes.metric}
                          color={iconProps.icon.color}
                        />
                      )}
                    </View>
                  )}
                />
              );
            }}
          />
        )}
      </StatsProgressCard>
    </View>
  );
}
