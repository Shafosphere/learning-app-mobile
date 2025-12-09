import Octicons from "@expo/vector-icons/Octicons";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

type FlashcardsPeekOverlayProps = {
  visible: boolean;
  boxKey: keyof BoxesState | null;
  cards: WordWithTranslations[];
  onClose: () => void;
};

const BOX_LABELS: Record<keyof BoxesState, string> = {
  boxZero: "0",
  boxOne: "1",
  boxTwo: "2",
  boxThree: "3",
  boxFour: "4",
  boxFive: "5",
};

const usePeekStyles = createThemeStylesHook((colors) => ({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  dialog: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 16,
    backgroundColor: colors.secondBackground,
    padding: 16,
    gap: 12,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleGroup: {
    flexShrink: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.headline,
  },
  subtitle: {
    marginTop: 2,
    color: colors.paragraph,
    fontSize: 14,
  },
  closeButton: {
    padding: 8,
    marginRight: -4,
  },
  closeIcon: {
    color: colors.headline,
  },
  cardsList: {
    width: "100%",
  },
  cardWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: 14,
    justifyContent: "center",
    minHeight: 120,
  },
  label: {
    color: colors.paragraph,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  prompt: {
    color: colors.headline,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6,
  },
  answer: {
    color: colors.paragraph,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 10,
  },
  extraTranslations: {
    marginTop: 6,
    color: colors.paragraph,
    fontSize: 14,
    fontWeight: "600",
  },
  counter: {
    alignSelf: "center",
    marginTop: 10,
    color: colors.paragraph,
    fontWeight: "600",
  },
  empty: {
    color: colors.paragraph,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 18,
  },
}));

export default function FlashcardsPeekOverlay({
  visible,
  boxKey,
  cards,
  onClose,
}: FlashcardsPeekOverlayProps) {
  const styles = usePeekStyles();
  const listRef = useRef<FlatList<WordWithTranslations>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { width } = useWindowDimensions();

  const sheetWidth = Math.min(width - 24, 480);
  const pageWidth = sheetWidth;
  const cardWidth = sheetWidth - 32;

  useEffect(() => {
    setActiveIndex(0);
    if (!visible) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, [visible, boxKey, cards.length]);

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(offsetX / pageWidth);
    const clamped = Math.max(0, Math.min(cards.length - 1, nextIndex));
    setActiveIndex(clamped);
  };

  const renderItem = ({
    item,
  }: {
    item: WordWithTranslations;
    index: number;
  }) => {
    const mainTranslation = item.translations?.[0] ?? "";
    const extraTranslations = Math.max(0, (item.translations?.length ?? 0) - 1);

    return (
      <View style={{ width: pageWidth, alignItems: "center" }}>
        <View style={[styles.cardWrapper, { width: cardWidth }]}>
          <Text style={styles.label}>Awers</Text>
          <Text style={styles.prompt} numberOfLines={2} ellipsizeMode="tail">
            {item.text || "Brak treści"}
          </Text>

          <Text style={[styles.label, { marginTop: 12 }]}>Rewers</Text>
          <Text style={styles.answer} numberOfLines={2} ellipsizeMode="tail">
            {mainTranslation || "Brak tłumaczenia"}
          </Text>
          {extraTranslations > 0 ? (
            <Text style={styles.extraTranslations}>
              +{extraTranslations} alt. tłumaczeń
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  const boxLabel = boxKey ? BOX_LABELS[boxKey] ?? "" : "";
  const hintText = cards.length
    ? "Przesuń w bok, aby podejrzeć kolejne fiszki."
    : "Brak fiszek w tym pudełku.";

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { width: sheetWidth }]}>
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <Text style={styles.title}>Pudełko {boxLabel}</Text>
              <Text style={styles.subtitle}>{hintText}</Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Zamknij podgląd pudełka"
              hitSlop={10}
              style={styles.closeButton}
            >
              <Octicons name="x" size={24} color={styles.closeIcon.color} />
            </Pressable>
          </View>

          {cards.length === 0 ? (
            <Text style={styles.empty}>Brak fiszek w tym pudełku.</Text>
          ) : (
            <>
              <FlatList
                ref={listRef}
                data={cards}
                keyExtractor={(item) => String(item.id)}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={pageWidth}
                decelerationRate="fast"
                bounces={false}
                overScrollMode="never"
                style={styles.cardsList}
                renderItem={renderItem}
                onMomentumScrollEnd={handleMomentumEnd}
                getItemLayout={(_, index) => ({
                  length: pageWidth,
                  offset: pageWidth * index,
                  index,
                })}
              />
              <Text style={styles.counter}>
                {activeIndex + 1} / {cards.length}
              </Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
