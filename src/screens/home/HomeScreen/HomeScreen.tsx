import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { useTranslation } from "react-i18next";
import { renderHomeTile, type HomeTile } from "@/src/components/home/flatList";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import { useOpenCoursePanel } from "@/src/hooks/useOpenCoursePanel";
import { useThemeSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "./HomeScreen-styles";
import { getHomeGridLayout } from "./homeGridLayout";

export default function HomeScreen() {
  const router = useRouter();
  const goToCoursePanel = useOpenCoursePanel();
  const { t } = useTranslation();
  const styles = useStyles();
  const { isTabletLayout } = useDeviceLayout();
  const { fontScale } = useWindowDimensions();
  const { fontScaleMultiplier } = useThemeSettings();
  const [viewport, setViewport] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const onGridLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport((previous) =>
      previous?.width === width && previous.height === height
        ? previous
        : { width, height },
    );
  }, []);
  const gridMetrics = viewport
    ? getHomeGridLayout({
        ...viewport,
        fontScale: fontScale * fontScaleMultiplier,
        isTabletLayout,
      })
    : null;

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
      face: "nice",
      pressedFace: "happy",
      decorations: [
        { source: require("@/assets/ui/stats/streak/lewyrog.png") },
      ],
      action: goToCoursePanel,
    },
    {
      key: "custom",
      title: t("screens.home.home.home.title.stworz"),
      subtitle: t("screens.home.home.home.subtitle.kreatorKursow"),
      face: "sparkle",
      pressedFace: "xd",
      contentSource: require("@/assets/mascot/box/props/scissors.png"),
      action: goToCustomCourse,
    },
    {
      key: "stats",
      title: t("screens.home.home.home.title.statystyki"),
      subtitle: t("screens.home.home.home.subtitle.zobaczWyniki"),
      face: "ez",
      pressedFace: "sparkle",
      contentSource: require("@/assets/mascot/box/props/stats.png"),
      contentStyle: {
        top: -10,
        right: -2,
        transform: [{ rotate: "10deg" }, { scale: 1.2 }],
      },
      action: goToStats,
    },
    {
      key: "wiki",
      title: t("screens.home.home.home.title.przewodnik"),
      subtitle: t("screens.home.home.home.subtitle.instrukcjeIWskazowki"),
      face: "owo",
      faceParts: { eyes: "sparkle" },
      pressedFaceParts: { eyes: "happy", mouth: "owo" },
      contentSource: require("@/assets/mascot/box/props/scroll.png"),
      contentStyle: { top: -16 },
      contentCopyStyles: [
        { right: 4, transform: [{ rotate: "0deg" }, { scale: 1.15 }] },
        { right: -12, transform: [{ rotate: "15deg" }, { scale: 1.15 }] },
        { right: -28, transform: [{ rotate: "30deg" }, { scale: 1.15 }] },
      ],
      foregroundSource: require("@/assets/mascot/box/props/magnifying-glass.png"),
      foregroundStyle: {
        right: -19,
        transform: [{ rotate: "5deg" }],
      },
      action: goToWiki,
    },
    {
      key: "support",
      title: t("screens.home.home.home.title.wsparcie"),
      subtitle: t("screens.home.home.home.subtitle.pomocIInformacje"),
      face: "blushed",
      faceParts: { eyes: "happy", mouth: "smile" },
      pressedFace: "love",
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
    tileSize: gridMetrics?.tileSize ?? 0,
  });

  return (
    <View style={[styles.container, isTabletLayout && styles.containerTablet]}>
      <View
        style={styles.gridWrapper}
        onLayout={onGridLayout}
        testID="home-grid-viewport"
      >
        {gridMetrics && gridMetrics.tileSize > 0 && (
          <FlatList
            testID="home-grid"
            style={[
              styles.grid,
              { width: gridMetrics.gridWidth, marginTop: gridMetrics.topPadding },
            ]}
            data={listData}
            keyExtractor={(item) => item.key}
            renderItem={renderTile}
            numColumns={2}
            scrollEnabled={gridMetrics.scrollEnabled}
            bounces={false}
            alwaysBounceVertical={false}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={{ gap: gridMetrics.gap }}
            contentContainerStyle={[
              styles.gridContent,
              { gap: gridMetrics.gap },
            ]}
          />
        )}
      </View>
    </View>
  );
}
