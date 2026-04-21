// index.tsx
import { useRouter } from "expo-router";
import type React from "react";
import { FlatList, View, Text, useWindowDimensions } from "react-native";
import { renderHomeTile, type HomeTile } from "@/src/components/home/flatList";
import { useStyles } from "./HomeScreen-styles";
import { quotes } from "./quotes";

export default function HomeScreen() {
  const router = useRouter();
  const styles = useStyles();
  const { height: screenHeight } = useWindowDimensions();
  const logo = require("../../../assets/illustrations/mascot-box/branding/logo.png");
  const statsImage = require("../../../assets/images/home/stats.png");
  const customImage = require("../../../assets/images/home/customize.png");
  const tutorialImage = require("../../../assets/images/home/tutorial.png");
  const supportImage = require("../../../assets/images/home/support.png");
  const isCompactHeight = screenHeight < 760;

  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

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
      title: "Kursy",
      subtitle: "Przypięte kursy",
      image: logo,
      action: goToCoursePanel,
    },
    {
      key: "custom",
      title: "Stwórz",
      subtitle: "Kreator kursów",
      image: customImage,
      action: goToCustomCourse,
    },
    {
      key: "stats",
      title: "Statystyki",
      subtitle: "Zobacz wyniki",
      image: statsImage,
      action: goToStats,
    },
    {
      key: "wiki",
      title: "Przewodnik",
      subtitle: "Instrukcje i wskazówki",
      image: tutorialImage,
      action: goToWiki,
    },
    {
      key: "support",
      title: "Wsparcie",
      subtitle: "Pomoc i informacje",
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
