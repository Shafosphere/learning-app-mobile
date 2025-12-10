import { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import { usePeekStyles } from "./Peek-styles";
import Octicons from "@expo/vector-icons/Octicons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

type FlashcardsPeekOverlayProps = {
  visible: boolean;
  boxKey: keyof BoxesState | null;
  cards: WordWithTranslations[];
  activeCustomCourseId: number | null;
  activeCourseName?: string | null;
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

export default function FlashcardsPeekOverlay({
  visible,
  boxKey,
  cards,
  activeCustomCourseId,
  activeCourseName,
  onClose,
}: FlashcardsPeekOverlayProps) {
  const styles = usePeekStyles();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList<WordWithTranslations>>(null);
  const { width, height } = useWindowDimensions();

  const sheetWidth = Math.min(width - 32, 480);
  const boxLabel = boxKey ? BOX_LABELS[boxKey] ?? "?" : "?";

  useEffect(() => {
    if (visible) {
      // Reset scroll position
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      });

      // Entrance Animation
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Exit Animation (optional, usually overlay unmounts, but if controlled externally)
    }
  }, [visible, boxKey, cards.length, opacityAnim, scaleAnim]);

  const renderItem = ({
    item,
    index,
  }: {
    item: WordWithTranslations;
    index: number;
  }) => {
    const isBoxZero = boxKey === "boxZero";
    const boxIsReversed = boxKey === "boxTwo" || boxKey === "boxFour";
    const shouldFlip =
      activeCustomCourseId == null ? true : Boolean(item.flipped);
    const prompt =
      boxIsReversed && shouldFlip ? item.translations?.[0] ?? "" : item.text;
    const displayPrompt = prompt?.trim() || "Brak treści";
    const translations =
      item.translations?.map((t) => t?.trim()).filter(Boolean) ?? [];
    const mainTranslation = translations[0] ?? "Brak tłumaczenia";
    const extraTranslations = translations.slice(1);

    return (
      <View style={styles.cardWrapper}>
        {isBoxZero ? (
          <View style={[styles.cardContent, styles.cardContentBoxZero]}>
            <View style={styles.cardSide}>
              <Text style={styles.cardSideLabel}>Fiszka</Text>
              <Text style={styles.cardSideIndex}>#{index + 1}</Text>
            </View>

            <View style={styles.cardMain}>
              <View style={styles.cardLine}>
                <Text style={styles.cardTag}>Awers</Text>
                <Text
                  style={styles.cardPrimary}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {displayPrompt}
                </Text>
              </View>
              <View style={styles.cardLine}>
                <Text style={[styles.cardTag]}>Rewers</Text>
                <Text
                  style={[styles.cardSecondary, styles.rewers]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {mainTranslation}
                </Text>
              </View>
              {extraTranslations.length ? (
                <Text style={styles.cardAlternatives}>
                  <Text style={styles.cardAlternativesLabel}>
                    Pozostałe poprawne:{" "}
                  </Text>
                  {extraTranslations.join(", ")}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={[styles.cardContentSimple]}>
            <Text style={styles.cardSimpleIndex}>FISZKA #{index + 1}</Text>
            <View style={styles.cardLine}>
              <Text style={styles.cardTag}>Awers:</Text>
              <Text
                style={styles.cardPrimary}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {displayPrompt}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const hintText = cards.length ? "Lista fiszek w tym pudełku." : "";
  const countLabel = cards.length
    ? `${cards.length} ${cards.length === 1 ? "fiszka" : "fiszek"}`
    : "Brak fiszek";
  const courseLabel = activeCourseName?.trim() || "podgląd";

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.dialog,
            {
              width: sheetWidth,
              maxHeight: Math.max(300, height * 0.75),
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.sectionHeader}>
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Text style={styles.title}>Pudełko nr {boxLabel}</Text>
                {hintText ? (
                  <Text style={styles.subtitle}>{hintText}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Zamknij"
                hitSlop={12}
                style={({ pressed }) => [
                  styles.closeButton,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Octicons name="x" size={18} color={styles.closeIcon.color} />
              </Pressable>
            </View>
          </View>

          {/* Meta */}
          <View style={styles.metaBar}>
            <Text style={styles.metaText}>
              <Text style={styles.metaStrong}>{countLabel}</Text>
              {/* {cards.length ? ` · kurs: ${courseLabel}` : ""} */}
            </Text>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillText}>
                {cards.length ? `${courseLabel}` : ""}
              </Text>
            </View>
          </View>

          {/* Body */}
          <View style={styles.sectionBody}>
            {cards.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrapper}>
                  <Octicons
                    name="inbox"
                    size={32}
                    color={styles.emptyIcon.color}
                  />
                </View>
                <Text style={styles.emptyTitle}>Pudełko jest puste</Text>
                <Text style={styles.emptyDescription}>
                  Fiszki trafią tutaj, gdy osiągniesz odpowiedni poziom nauki.
                </Text>
              </View>
            ) : (
              <>
                <FlatList
                  ref={listRef}
                  data={cards}
                  keyExtractor={(item) => String(item.id)}
                  showsVerticalScrollIndicator={false}
                  style={styles.cardsList}
                  ListFooterComponent={<View style={styles.cardsListFooter} />}
                  renderItem={renderItem}
                  contentContainerStyle={styles.cardsListContent}
                />
              </>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
