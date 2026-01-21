// index.tsx
import { useSettings } from "@/src/contexts/SettingsContext";
import { useRouter } from "expo-router";
import type React from "react";
import {
  FlatList,
  Image,
  Pressable,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useStyles } from "./HomeScreen-styles";
import { quotes } from "./quotes";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Feather from "@expo/vector-icons/Feather";
import Entypo from "@expo/vector-icons/Entypo";

const ICON_SIZE = 70;

type HomeTile = {
  key: string;
  title: string;
  subtitle: string;
  image?: ImageSourcePropType;
  icon?: React.ReactNode;
  action?: () => void;
  isPlaceholder?: boolean;
};

export default function HomeScreen() {
  const router = useRouter();
  const styles = useStyles();
  const { colors } = useSettings();
  const logo = require("../../../assets/illustrations/box/logo.png");

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

  const tiles: HomeTile[] = [
    {
      key: "courses",
      title: "Kursy",
      subtitle: "Twoje przypięte kursy",
      image: logo,
      action: goToCoursePanel,
    },
    {
      key: "stats",
      title: "Statystyki",
      subtitle: "Zobacz wyniki",
      icon: (
        <Feather name="bar-chart-2" size={ICON_SIZE} color={colors.headline} />
      ),
      action: goToStats,
    },
    {
      key: "custom",
      title: "Własne fiszki",
      subtitle: "Kreator własnych kursów",
      icon: <Entypo name="pencil" size={ICON_SIZE} color={colors.headline} />,
      action: goToCustomCourse,
    },
    {
      key: "wiki",
      title: "Przewodnik",
      subtitle: "Instrukcje i wskazówki",
      icon: (
        <Feather name="book-open" size={ICON_SIZE} color={colors.headline} />
      ),
      action: goToWiki,
    },
    {
      key: "support",
      title: "Wsparcie",
      subtitle: "Pomoc i sugestie",
      icon: (
        <MaterialIcons
          name="support-agent"
          size={ICON_SIZE}
          color={colors.headline}
        />
      ),
      action: goToSupport,
    },
  ];

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

  const renderTile = ({ item }: { item: HomeTile }) => {
    if (item.isPlaceholder) {
      return <View style={[styles.tile, styles.placeholderTile]} />;
    }

    return (
      <Pressable
        onPress={item.action}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
      >
        <View style={styles.iconBox}>
          {item.icon ? (
            item.icon
          ) : item.image ? (
            <Image source={item.image} style={styles.iconImage} />
          ) : null}
        </View>
        <View style={styles.tileText}>
          <Text style={styles.tileTitle}>{item.title}</Text>
          <Text
            style={[
              styles.tileSubtitle,
              !item.subtitle && styles.tileSubtitleHidden,
            ]}
          >
            {item.subtitle || "placeholder"}
          </Text>
        </View>
      </Pressable>
    );
  };

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
