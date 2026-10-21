import StatsProgressCard from "./StatsProgressCard";
import StatsProgressList from "./StatsProgressList";
import StatsProgressRow from "./StatsProgressRow";
import MyButton from "@/src/components/button/button";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SvgUri, SvgXml } from "react-native-svg";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { getHardFlashcards, type HardFlashcard } from "@/src/db/sqlite/db";
import { useSettings } from "@/src/contexts/SettingsContext";
import StatsSectionHeader from "./StatsSectionHeader";
import { useTranslation } from "react-i18next";
import { statsIconBackgrounds, statsIconSizes, statsMetricStyles, statsSectionStyles, statsTypography } from "@/src/screens/stats/StatsScreen/statsDesign";

const useStyles = createThemeStylesHook((colors) => ({
  section: {
    ...statsSectionStyles.section,
  },
  pager: {
    alignSelf: "stretch",
  },
  navigation: {
    flexDirection: "row",
    gap: 12,
  },
  navigationButton: {
    flex: 1,
    minWidth: 0,
  },
  page: {
    alignSelf: "stretch",
  },
  thumbnailWrap: {
    ...statsMetricStyles.iconContainer,
    overflow: "hidden",
  },
  thumbnailImage: {
    width: statsIconSizes.metric,
    height: statsIconSizes.metric,
  },
  placeholderIcon: {
    ...statsMetricStyles.iconContainer,
  },
  empty: {
    ...statsTypography.description,
    color: colors.paragraph,
    padding: 16,
  },
  loading: {
    ...statsTypography.description,
    color: colors.paragraph,
    opacity: 0.7,
    padding: 16,
  },
}));

type HardWordsPage = {
  key: "active" | "global";
  scope: string;
  items: HardFlashcard[];
};

const LIST_LIMIT = 5;

const isSvgUri = (value: string) =>
  /\.svg(\?|#|$)/i.test(value) || value.startsWith("data:image/svg+xml");

function decodeDataSvgUri(uri: string) {
  const raw = uri.split(",")[1] ?? "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function getFlashcardLabel(item: HardFlashcard) {
  const frontText = (item.frontText ?? "").trim();
  const backText = (item.backText ?? "").trim();
  return frontText || backText || "—";
}

function getFlashcardImage(item: HardFlashcard) {
  return item.imageFront ?? item.imageBack ?? null;
}

function formatWrongCount(count: number) {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;

  if (abs === 1) {
    return `${count} błąd`;
  }

  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return `${count} błędy`;
  }

  return `${count} błędów`;
}

export default function HardWordsList() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { activeCustomCourseId, colors } = useSettings();
  const listRef = useRef<FlatList<HardWordsPage> | null>(null);
  const [globalItems, setGlobalItems] = useState<HardFlashcard[]>([]);
  const [activeItems, setActiveItems] = useState<HardFlashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagerWidth, setPagerWidth] = useState(0);
  const [visiblePageIndex, setVisiblePageIndex] = useState(
    activeCustomCourseId == null ? 0 : 1
  );

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    (async () => {
      try {
        const [globalRows, activeRows] = await Promise.all([
          getHardFlashcards(undefined, LIST_LIMIT),
          activeCustomCourseId == null
            ? Promise.resolve([])
            : getHardFlashcards(activeCustomCourseId, LIST_LIMIT),
        ]);
        if (!mounted) return;
        setGlobalItems(globalRows);
        setActiveItems(activeRows);
        setIsLoading(false);
      } catch {
        if (!mounted) return;
        setGlobalItems([]);
        setActiveItems([]);
        setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeCustomCourseId]);

  const pages = useMemo<HardWordsPage[]>(() => {
    const next: HardWordsPage[] = [];
    if (activeCustomCourseId != null) {
      next.push({
        key: "active",
        scope: t("components.stats.hardWordsList.scope.activeCourse"),
        items: activeItems,
      });
    }
    next.push({
      key: "global",
      scope: t("components.stats.hardWordsList.scope.global"),
      items: globalItems,
    });
    return next;
  }, [activeCustomCourseId, activeItems, globalItems, t]);

  useEffect(() => {
    const nextIndex = Math.max(0, pages.length - 1);
    setVisiblePageIndex(nextIndex);
    if (pagerWidth <= 0 || pages.length <= 1) {
      return;
    }
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
    });
  }, [activeCustomCourseId, pagerWidth, pages.length]);

  const pageWidth = Math.max(pagerWidth, 1);
  const visiblePage = pages[visiblePageIndex] ?? pages[pages.length - 1] ?? null;

  const handlePagerEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth <= 0) return;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    const safeIndex = Math.max(0, Math.min(pages.length - 1, nextIndex));
    setVisiblePageIndex(safeIndex);
  };

  const canGoBack = pagerWidth > 0 && visiblePageIndex > 0;
  const canGoForward = pagerWidth > 0 && visiblePageIndex < pages.length - 1;

  const changePage = (direction: -1 | 1) => {
    if (pagerWidth <= 0) return;
    const nextIndex = Math.max(0, Math.min(pages.length - 1, visiblePageIndex + direction));
    if (nextIndex === visiblePageIndex) return;
    listRef.current?.scrollToOffset({ offset: nextIndex * pageWidth, animated: true });
    setVisiblePageIndex(nextIndex);
  };

  const renderThumbnail = (item: HardFlashcard, index: number) => {
    const imageUri = getFlashcardImage(item);
    const background = {
      backgroundColor: statsIconBackgrounds[index % statsIconBackgrounds.length],
    };
    if (!imageUri) {
      return (
        <View testID={`hard-word-placeholder-${item.id}`} style={[styles.placeholderIcon, background]}>
          <MaterialCommunityIcons
            name="cards"
            size={statsIconSizes.metric}
            color={colors.my_green}
          />
        </View>
      );
    }

    if (isSvgUri(imageUri)) {
      const isDataSvg = imageUri.startsWith("data:image/svg+xml");
      return (
        <View testID={`hard-word-image-${item.id}`} style={[styles.thumbnailWrap, background]}>
          {isDataSvg ? (
            <SvgXml
              xml={decodeDataSvgUri(imageUri)}
              width={statsIconSizes.metric}
              height={statsIconSizes.metric}
              preserveAspectRatio="xMidYMid meet"
            />
          ) : (
            <SvgUri
              uri={imageUri}
              width={statsIconSizes.metric}
              height={statsIconSizes.metric}
              preserveAspectRatio="xMidYMid meet"
            />
          )}
        </View>
      );
    }

    return (
      <View testID={`hard-word-image-${item.id}`} style={[styles.thumbnailWrap, background]}>
        <Image
          source={{ uri: imageUri }}
          recyclingKey={imageUri}
          style={styles.thumbnailImage}
          contentFit="contain"
          transition={0}
        />
      </View>
    );
  };

  const renderPage = ({ item }: { item: HardWordsPage }) => {
    const maxWrongCount = item.items.reduce(
      (max, flashcard) => Math.max(max, flashcard.wrongCount),
      0
    );

    return (
      <View style={[styles.page, { width: pageWidth }]}>
        {isLoading ? (
          <Text style={styles.loading}>
            {t("components.stats.hardWordsList.textChild.ladowanie")}
          </Text>
        ) : item.items.length === 0 ? (
          <Text style={styles.empty}>
            {t(
              "components.stats.hardWordsList.textChild.brakDanychSprobujPogracDluzej"
            )}
          </Text>
        ) : (
          <StatsProgressList
            testID={`hard-words-list-${item.key}`}
            items={item.items}
            keyExtractor={(flashcard) => flashcard.id.toString()}
            renderItem={(flashcard, index, layout) => {
              const progress = maxWrongCount > 0 ? flashcard.wrongCount / maxWrongCount : 0;
              const progressPercent = `${Math.round(progress * 100)}%`;
              return (
                <StatsProgressRow
                  {...layout}
                  icon={renderThumbnail(flashcard, index)}
                  label={getFlashcardLabel(flashcard)}
                  value={formatWrongCount(flashcard.wrongCount)}
                  progress={progress}
                  progressColor={colors.my_red}
                  progressLabel={getFlashcardLabel(flashcard)}
                  fillTestID={`hard-word-fill-${flashcard.id}`}
                  fillAccessibilityLabel={t(
                    "components.stats.hardWordsList.accessibilityLabel.wypelnienieBledowValue",
                    { value: progressPercent },
                  )}
                />
              );
            }}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <StatsSectionHeader
        title={t("components.stats.hardWordsList.title.trudneFiszki")}
        subtitle={t("components.stats.hardWordsList.subtitle.description")}
        metadata={visiblePage?.scope}
        metadataWidthReference={t("components.stats.hardWordsList.scope.activeCourse")}
      />

      <StatsProgressCard
        testID="hard-words-pager-frame"
        onLayout={(event) => setPagerWidth(event.nativeEvent.layout.width)}
      >
        {pagerWidth > 0 ? (
          <FlatList
            key={`${pages.length}-${pageWidth}`}
            ref={listRef}
            data={pages}
            horizontal
            pagingEnabled
            initialNumToRender={pages.length}
            initialScrollIndex={Math.max(0, pages.length - 1)}
            getItemLayout={(_data, index) => ({
              length: pageWidth,
              offset: pageWidth * index,
              index,
            })}
            showsHorizontalScrollIndicator={false}
            bounces={false}
            keyExtractor={(item) => item.key}
            renderItem={renderPage}
            onMomentumScrollEnd={handlePagerEnd}
            onScrollToIndexFailed={() => {
              requestAnimationFrame(() => {
                listRef.current?.scrollToEnd({ animated: false });
              });
            }}
            style={styles.pager}
          />
        ) : null}
      </StatsProgressCard>
      <View style={styles.navigation}>
        <MyButton
          accessibilityLabel={t("components.stats.hardWordsList.navigation.previousPage")}
          color="my_yellow"
          onPress={() => changePage(-1)}
          disabled={!canGoBack}
          autoWidth
          style={styles.navigationButton}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={colors.headline}
            style={{ opacity: canGoBack ? 1 : 0.35 }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </MyButton>
        <MyButton
          accessibilityLabel={t("components.stats.hardWordsList.navigation.nextPage")}
          color="my_yellow"
          onPress={() => changePage(1)}
          disabled={!canGoForward}
          autoWidth
          style={styles.navigationButton}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={colors.headline}
            style={{ opacity: canGoForward ? 1 : 0.35 }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </MyButton>
      </View>
    </View>
  );
}
