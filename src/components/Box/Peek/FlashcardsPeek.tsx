import { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import { usePeekStyles } from "./Peek-styles";
import Octicons from "@expo/vector-icons/Octicons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";

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
    const type = item.type ?? "text";
    const promptImage = boxIsReversed && shouldFlip ? item.imageBack : item.imageFront;
    const answerImage = boxIsReversed && shouldFlip ? item.imageFront : item.imageBack;
    const hasPromptImage = Boolean(promptImage);
    const hasAnswerImage = Boolean(answerImage);
    const displayPrompt = prompt?.trim() || (hasPromptImage ? "" : "Brak treści");
    const translations =
      item.translations?.map((t) => t?.trim()).filter(Boolean) ?? [];
    const mainTranslation = translations[0] ?? "Brak tłumaczenia";
    const extraTranslations = type === "true_false" ? [] : translations.slice(1);
    const normalizedTrueFalse = translations[0]?.toLowerCase() ?? "";
    const trueFalseAnswer =
      normalizedTrueFalse === "true"
        ? "Prawda"
        : normalizedTrueFalse === "false"
          ? "Fałsz"
          : translations[0]?.trim() || "Brak odpowiedzi";
    const inferredType =
      type === "true_false"
        ? "true_false"
        : hasPromptImage || hasAnswerImage
          ? "image"
          : "text";
    const typeLabel =
      inferredType === "true_false"
        ? "Prawda / Fałsz"
        : inferredType === "image"
          ? "Obrazek"
          : "Tekst";
    const showPromptImageOnly =
      inferredType === "image" && hasPromptImage && !displayPrompt;
    const showTrueFalseAnswer = inferredType === "true_false" && isBoxZero;

    return (
      <View style={styles.cardWrapper}>
        {isBoxZero ? (
          <View style={[styles.cardContent, styles.cardContentBoxZero]}>
            <View style={styles.cardSide}>
              <Text style={styles.cardSideLabel}>Fiszka</Text>
              <Text style={styles.cardSideIndex}>#{index + 1}</Text>
            </View>

            <View style={styles.cardMain}>
              <View style={styles.cardMetaRow}>
                <View style={styles.typePill}>
                  <Text style={styles.typePillText}>{typeLabel}</Text>
                </View>
              </View>
              {showPromptImageOnly ? (
                <View style={styles.imageOnlyWrapper}>
                  <Image
                    source={{ uri: promptImage as string }}
                    style={styles.cardImageLarge}
                    contentFit="contain"
                  />
                </View>
              ) : (
                <View style={styles.cardLine}>
                  <Text style={styles.cardTag}>Awers</Text>
                  <View style={styles.cardValue}>
                    {hasPromptImage ? (
                      <Image
                        source={{ uri: promptImage as string }}
                        style={styles.cardImage}
                        contentFit="contain"
                      />
                    ) : null}
                    {displayPrompt ? (
                      <Text
                        style={styles.cardPrimary}
                        numberOfLines={hasPromptImage ? 3 : 2}
                        ellipsizeMode="tail"
                      >
                        {displayPrompt}
                      </Text>
                    ) : null}
                    {!hasPromptImage && !displayPrompt ? (
                      <Text style={styles.cardEmptyValue}>Brak treści</Text>
                    ) : null}
                  </View>
                </View>
              )}
              <View style={styles.cardLine}>
                <Text style={[styles.cardTag]}>Rewers</Text>
                <View style={styles.cardValue}>
                  {hasAnswerImage ? (
                    <Image
                      source={{ uri: answerImage as string }}
                      style={styles.cardImage}
                      contentFit="contain"
                    />
                    ) : null}
                    <Text
                      style={[
                        styles.cardSecondary,
                        styles.rewers,
                        inferredType === "true_false" ? styles.cardTrueFalse : undefined,
                      ]}
                      numberOfLines={hasAnswerImage ? 3 : 2}
                      ellipsizeMode="tail"
                    >
                      {inferredType === "true_false" ? trueFalseAnswer : mainTranslation}
                    </Text>
                    {!hasAnswerImage && !mainTranslation ? (
                      <Text style={styles.cardEmptyValue}>Brak tłumaczenia</Text>
                    ) : null}
                  </View>
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
            <View style={styles.cardMetaRow}>
              <Text style={styles.cardSimpleIndex}>FISZKA #{index + 1}</Text>
              <View style={styles.typePill}>
                <Text style={styles.typePillText}>{typeLabel}</Text>
              </View>
            </View>
            <View style={styles.cardLine}>
              {showPromptImageOnly ? (
                <View style={styles.imageOnlyWrapper}>
                  <Image
                    source={{ uri: promptImage as string }}
                    style={styles.cardImageLarge}
                    contentFit="contain"
                  />
                </View>
              ) : (
                <>
                  <Text style={styles.cardTag}>Pytanie:</Text>
                  <View style={styles.cardValue}>
                    {hasPromptImage ? (
                      <Image
                        source={{ uri: promptImage as string }}
                        style={styles.cardImageSmall}
                        contentFit="contain"
                      />
                    ) : null}
                    {displayPrompt ? (
                      <Text
                        style={styles.cardPrimary}
                        numberOfLines={hasPromptImage ? 3 : 2}
                        ellipsizeMode="tail"
                      >
                        {displayPrompt}
                      </Text>
                    ) : null}
                    {!hasPromptImage && !displayPrompt ? (
                      <Text style={styles.cardEmptyValue}>Brak treści</Text>
                    ) : null}
                  </View>
                </>
              )}
            </View>
            {showTrueFalseAnswer ? (
              <View style={styles.cardLine}>
                <Text style={styles.cardTag}>Odpowiedź:</Text>
                <Text style={[styles.cardSecondary, styles.cardTrueFalse]}>
                  {trueFalseAnswer}
                </Text>
              </View>
            ) : null}
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
                  keyExtractor={(item, idx) =>
                    `${item.id}-${item.type ?? "text"}-${idx}`
                  }
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
