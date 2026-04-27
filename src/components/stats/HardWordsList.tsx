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

const useStyles = createThemeStylesHook((colors) => ({
  card: {
    backgroundColor: colors.secondBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  header: {
    marginBottom: 18,
  },
  pager: {
    alignSelf: "stretch",
  },
  pagerFrame: {
    alignSelf: "stretch",
    overflow: "hidden",
  },
  page: {
    alignSelf: "stretch",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 9,
  },
  thumbnailWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.lightbg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
    borderWidth: 1,
    borderColor: `${colors.border}DD`,
  },
  thumbnailImage: {
    width: 46,
    height: 46,
  },
  placeholderIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  word: {
    color: colors.headline,
    fontSize: 15,
    fontWeight: "800",
    flexShrink: 1,
  },
  track: {
    height: 9,
    borderRadius: 999,
    backgroundColor: `${colors.my_red}18`,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.my_red,
  },
  badge: {
    minWidth: 68,
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: `${colors.my_red}14`,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  badgeText: {
    color: colors.my_red,
    fontSize: 13,
    fontWeight: "800",
  },
  empty: {
    color: colors.paragraph,
    fontSize: 13,
    paddingVertical: 8,
  },
  loading: {
    color: colors.paragraph,
    fontSize: 13,
    opacity: 0.7,
    paddingVertical: 8,
  },
}));

type HardWordsPage = {
  key: "active" | "global";
  subtitle: string;
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
        subtitle: "Najczęściej mylone fiszki z aktywnego kursu",
        items: activeItems,
      });
    }
    next.push({
      key: "global",
      subtitle: "Najczęściej mylone fiszki ogólnie",
      items: globalItems,
    });
    return next;
  }, [activeCustomCourseId, activeItems, globalItems]);

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

  const renderThumbnail = (item: HardFlashcard) => {
    const imageUri = getFlashcardImage(item);
    if (!imageUri) {
      return (
        <View testID={`hard-word-placeholder-${item.id}`} style={styles.placeholderIcon}>
          <MaterialCommunityIcons
            name="cards"
            size={30}
            color={`${colors.paragraph}AA`}
          />
        </View>
      );
    }

    if (isSvgUri(imageUri)) {
      const isDataSvg = imageUri.startsWith("data:image/svg+xml");
      return (
        <View testID={`hard-word-image-${item.id}`} style={styles.thumbnailWrap}>
          {isDataSvg ? (
            <SvgXml
              xml={decodeDataSvgUri(imageUri)}
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid slice"
            />
          ) : (
            <SvgUri
              uri={imageUri}
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid slice"
            />
          )}
        </View>
      );
    }

    return (
      <View testID={`hard-word-image-${item.id}`} style={styles.thumbnailWrap}>
        <Image
          source={{ uri: imageUri }}
          recyclingKey={imageUri}
          style={styles.thumbnailImage}
          contentFit="cover"
          transition={0}
        />
      </View>
    );
  };

  const renderItem = (item: HardFlashcard, maxWrongCount: number) => {
    const progress =
      maxWrongCount > 0 ? Math.min(1, item.wrongCount / maxWrongCount) : 0;
    const progressPercent = `${Math.round(progress * 100)}%` as `${number}%`;

    return (
      <View key={item.id} style={styles.item}>
        {renderThumbnail(item)}
        <View style={styles.content}>
          <Text style={styles.word} numberOfLines={1} ellipsizeMode="tail">
            {getFlashcardLabel(item)}
          </Text>
          <View style={styles.track}>
            <View
              testID={`hard-word-fill-${item.id}`}
              accessibilityLabel={`Wypełnienie błędów ${progressPercent}`}
              style={[styles.fill, { width: progressPercent }]}
            />
          </View>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{formatWrongCount(item.wrongCount)}</Text>
        </View>
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
          <Text style={styles.loading}>Ładowanie...</Text>
        ) : item.items.length === 0 ? (
          <Text style={styles.empty}>Brak danych – spróbuj pograć dłużej.</Text>
        ) : (
          <View>{item.items.map((flashcard) => renderItem(flashcard, maxWrongCount))}</View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <StatsSectionHeader
        style={styles.header}
        icon={<Ionicons name="trophy-outline" size={30} color="#5B3FD6" />}
        title="Trudne fiszki"
        subtitle={visiblePage?.subtitle ?? "Najczęściej mylone fiszki ogólnie"}
      />

      <View
        testID="hard-words-pager-frame"
        style={styles.pagerFrame}
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
      </View>
    </View>
  );
}
