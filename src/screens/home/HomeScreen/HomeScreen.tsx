// index.tsx
import { useRouter } from "expo-router";
import type React from "react";
import { FlatList, View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { renderHomeTile, type HomeTile } from "@/src/components/home/flatList";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import { useStyles } from "./HomeScreen-styles";
import {
  HOME_QUOTES_TRANSLATION_KEY,
  normalizeHomeQuotes,
} from "@/src/constants/homeQuotes";

const TABLET_GRID_MAX_WIDTH = 500;
const TABLET_HORIZONTAL_PADDING = 72;
const HOME_GRID_GAP_RATIO = 0.054;
const TABLET_GRID_MIN_GAP = 20;
const TABLET_GRID_MAX_GAP = 28;
const HOME_ICON_TILE_RATIO = 0.54;
const TABLET_ICON_MIN_SIZE = 104;
const TABLET_ICON_MAX_SIZE = 132;

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const styles = useStyles();
  const {
    width: screenWidth,
    height: screenHeight,
    isTabletLayout,
  } = useDeviceLayout();
  const logo = require("../../../../assets/illustrations/mascot-box/branding/logo.png");
  const statsImage = require("../../../../assets/images/home/stats.png");
  const customImage = require("../../../../assets/images/home/customize.png");
  const tutorialImage = require("../../../../assets/images/home/tutorial.png");
  const supportImage = require("../../../../assets/images/home/support.png");
  const isCompactHeight = screenHeight < 760;
  const tabletGridWidth = Math.min(
    screenWidth - TABLET_HORIZONTAL_PADDING * 2,
    TABLET_GRID_MAX_WIDTH
  );
  const tabletGridGap = Math.round(
    Math.min(
      TABLET_GRID_MAX_GAP,
      Math.max(TABLET_GRID_MIN_GAP, tabletGridWidth * HOME_GRID_GAP_RATIO)
    )
  );
  const tabletTileSize = (tabletGridWidth - tabletGridGap) / 2;
  const tabletIconSize = Math.round(
    Math.min(
      TABLET_ICON_MAX_SIZE,
      Math.max(TABLET_ICON_MIN_SIZE, tabletTileSize * HOME_ICON_TILE_RATIO)
    )
  );

  const quotes = normalizeHomeQuotes(
    t(HOME_QUOTES_TRANSLATION_KEY, { returnObjects: true })
  );
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)] ?? {
    text: "",
    author: "",
  };

  const goToCoursePanel = () => {
    router.push("/coursepanel");
  };

  const goToStats = () => {
    router.push("/stats");
  };

  const goToCustomCourse = () => {
    router.push("/custom_course");
  };

  const goToWiki = () => {
    router.push("/wiki");
  };

  const goToSupport = () => {
    router.push("/support");
  };

  const buildHomeTiles = (): HomeTile[] => [
    {
      key: "courses",
      title: t("repeats.labels.courses"),
      subtitle: t("screens.home.home.home.subtitle.przypieteKursy"),
      image: logo,
      action: goToCoursePanel,
    },
    {
      key: "custom",
      title: t("screens.home.home.home.title.stworz"),
      subtitle: t("screens.home.home.home.subtitle.kreatorKursow"),
      image: customImage,
      action: goToCustomCourse,
    },
    {
      key: "stats",
      title: t("screens.home.home.home.title.statystyki"),
      subtitle: t("screens.home.home.home.subtitle.zobaczWyniki"),
      image: statsImage,
      action: goToStats,
    },
    {
      key: "wiki",
      title: t("screens.home.home.home.title.przewodnik"),
      subtitle: t("screens.home.home.home.subtitle.instrukcjeIWskazowki"),
      image: tutorialImage,
      action: goToWiki,
    },
    {
      key: "support",
      title: t("screens.home.home.home.title.wsparcie"),
      subtitle: t("screens.home.home.home.subtitle.pomocIInformacje"),
      image: supportImage,
      action: goToSupport,
    },
  ];

  const tiles = buildHomeTiles();

  const listData =
    tiles.length % 2 === 0
      ? tiles
      : [
          ...tiles,
          {
            key: "placeholder",
            title: "",
            subtitle: "",
            isPlaceholder: true,
          },
        ];

  const renderTile = renderHomeTile(styles, {
    isTabletLayout,
    tabletIconSize,
  });

  return (
    <View style={[styles.container, isTabletLayout && styles.containerTablet]}>
      <View style={[styles.header, isCompactHeight && styles.headerCompact]}>
        <Text
          style={[styles.quote, isCompactHeight && styles.quoteCompact]}
          numberOfLines={isCompactHeight ? 2 : 3}
          adjustsFontSizeToFit
          minimumFontScale={isCompactHeight ? 0.72 : 0.82}
          ellipsizeMode="tail"
        >
          {randomQuote.text}
        </Text>
        <Text
          style={[styles.quoteAuthor, isCompactHeight && styles.quoteAuthorCompact]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {randomQuote.author}
        </Text>
      </View>

      <View
        style={[
          styles.gridWrapper,
          isTabletLayout && styles.gridWrapperTablet,
        ]}
      >
        <FlatList
          style={styles.grid}
          data={listData}
          keyExtractor={(item) => item.key}
          renderItem={renderTile}
          numColumns={2}
          scrollEnabled
          bounces={false}
          alwaysBounceVertical={false}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={[
            styles.gridRow,
            isTabletLayout && { gap: tabletGridGap },
          ]}
          contentContainerStyle={[
            styles.gridContent,
            isCompactHeight && styles.gridContentCompact,
            isTabletLayout && styles.gridContentTablet,
            isTabletLayout && { gap: tabletGridGap },
          ]}
        />
      </View>
    </View>
  );
}
