// index.tsx
import { useRouter } from "expo-router";
import type React from "react";
import { FlatList, View, Text } from "react-native";
import { renderHomeTile, type HomeTile } from "@/src/components/home/flatList";
import { useStyles } from "./HomeScreen-styles";
import { quotes } from "./quotes";

export default function HomeScreen() {
  const router = useRouter();
  const styles = useStyles();
  const logo = require("../../../assets/illustrations/box/logo.png");
  const statsImage = require("../../../assets/images/staty.png");
  const customImage = require("../../../assets/images/edit.png");
  const tutorialImage = require("../../../assets/images/tutorial.png");
  const supportImage = require("../../../assets/images/wsparcie.png");

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
      subtitle: "Twoje przypięte kursy",
      image: logo,
      action: goToCoursePanel,
    },
    {
      key: "custom",
      title: "Stwórz",
      subtitle: "Kreator własnych kursów",
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
      title: "Kontakt",
      subtitle: "Błedy i sugestie",
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
      <View style={styles.header}>
        <Text
          style={styles.quote}
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.9}
          ellipsizeMode="tail"
        >
          {randomQuote.text}
        </Text>
        <Text style={styles.quoteAuthor}>{randomQuote.author}</Text>
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.key}
        renderItem={renderTile}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
      />
    </View>
  );
}
