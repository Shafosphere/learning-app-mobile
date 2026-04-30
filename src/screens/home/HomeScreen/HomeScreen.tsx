// index.tsx
import { useRouter } from "expo-router";
import type React from "react";
import { FlatList, View, Text, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";
import { renderHomeTile, type HomeTile } from "@/src/components/home/flatList";
import { useStyles } from "./HomeScreen-styles";
import {
  HOME_QUOTES_TRANSLATION_KEY,
  normalizeHomeQuotes,
} from "@/src/constants/homeQuotes";

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const styles = useStyles();
  const { height: screenHeight } = useWindowDimensions();
  const logo = require("../../../../assets/illustrations/mascot-box/branding/logo.png");
  const statsImage = require("../../../../assets/images/home/stats.png");
  const customImage = require("../../../../assets/images/home/customize.png");
  const tutorialImage = require("../../../../assets/images/home/tutorial.png");
  const supportImage = require("../../../../assets/images/home/support.png");
  const isCompactHeight = screenHeight < 760;

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

  const renderTile = renderHomeTile(styles);

  return (
    <View style={styles.container}>
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
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[
          styles.gridContent,
          isCompactHeight && styles.gridContentCompact,
        ]}
      />
    </View>
  );
}
