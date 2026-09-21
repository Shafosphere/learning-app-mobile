import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";

import MyButton from "@/src/components/button/button";
import { CardMathText, hasMathSegments } from "@/src/components/card/subcomponents/CardMathText";
import { PromptImage } from "@/src/components/card/subcomponents/PromptImage";
import { useSettings } from "@/src/contexts/SettingsContext";

import type { ReviewMistakeNudgeCandidate } from "../model/reviewFlashcards.types";

type ReviewMistakeBatchModalProps = {
  visible: boolean;
  cards: ReviewMistakeNudgeCandidate[];
  confirming: boolean;
  error: boolean;
  onConfirm: (selectedCardIds: number[]) => void;
  onKeepReviewing: () => void;
};

const MAX_DIALOG_HEIGHT = 640;

export function ReviewMistakeBatchModal({
  visible,
  cards,
  confirming,
  error,
  onConfirm,
  onKeepReviewing,
}: ReviewMistakeBatchModalProps) {
  const { t } = useTranslation();
  const { colors } = useSettings();
  const { height } = useWindowDimensions();
  // Keep the dialog inside the backdrop's 24dp top/bottom breathing room.
  // A minimum here would let the modal exceed short landscape/split-screen windows.
  const maxHeight = Math.min(MAX_DIALOG_HEIGHT, Math.max(0, height - 48));
  const styles = createStyles(colors);
  const cardIds = useMemo(() => cards.map(({ card }) => card.id), [cards]);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<number>>(
    () => new Set(cardIds)
  );
  const selectedCount = selectedCardIds.size;
  const allSelected = selectedCount === cards.length;

  useEffect(() => {
    if (visible) setSelectedCardIds(new Set(cardIds));
  }, [cardIds, visible]);

  const toggleCard = (cardId: number) => {
    setSelectedCardIds((current) => {
      const next = new Set(current);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedCardIds(allSelected ? new Set() : new Set(cardIds));
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onKeepReviewing}>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { maxHeight }]} testID="review-mistake-batch-modal">
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{t("flashcards.card.reviewMistakeNudge.title")}</Text>
              <Text style={styles.description}>
                {t("flashcards.card.reviewMistakeNudge.description", { count: cards.length })}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={t("flashcards.card.reviewMistakeNudge.keep")}
              accessibilityRole="button"
              disabled={confirming}
              hitSlop={10}
              onPress={onKeepReviewing}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={19} color={colors.lightbg} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator
            style={styles.list}
            testID="review-mistake-batch-list"
          >
            <Pressable accessibilityRole="button" onPress={toggleAll} style={styles.selectionToggle}>
              <Text style={styles.selectionToggleText}>
                {allSelected
                  ? t("flashcards.card.reviewMistakeNudge.deselectAll")
                  : t("flashcards.card.reviewMistakeNudge.selectAll")}
              </Text>
            </Pressable>
            {cards.map(({ card }) => {
              const imageUri = card.imageFront || card.imageBack || null;
              const selected = selectedCardIds.has(card.id);
              const front = card.text.trim() || t("flashcards.card.peek.emptyContent");
              const back =
                card.translations[0]?.trim() ||
                t("flashcards.card.peek.emptyTranslation");

              return (
                <View key={card.id} style={styles.card} testID={`review-mistake-batch-card-${card.id}`}>
                  {imageUri ? (
                    <View style={styles.thumbnail}>
                      <PromptImage imageStyle={styles.promptImage} uri={imageUri} />
                    </View>
                  ) : (
                    <View style={[styles.thumbnail, styles.placeholder]}>
                      <Ionicons color={colors.paragraph} name="albums-outline" size={28} />
                    </View>
                  )}
                  <View style={styles.cardText}>
                    <Text style={styles.sideLabel}>{t("flashcards.card.reviewMistakeNudge.front")}</Text>
                    {hasMathSegments(front) ? (
                      <View style={styles.mathValue}>
                        <CardMathText colorOverride={colors.headline} text={front} textStyle={styles.value} />
                      </View>
                    ) : (
                      <Text numberOfLines={2} style={styles.value}>{front}</Text>
                    )}
                    <Text style={styles.sideLabel}>{t("flashcards.card.reviewMistakeNudge.back")}</Text>
                    {hasMathSegments(back) ? (
                      <View style={styles.mathValue}>
                        <CardMathText colorOverride={colors.headline} text={back} textStyle={styles.value} />
                      </View>
                    ) : (
                      <Text numberOfLines={2} style={styles.value}>{back}</Text>
                    )}
                  </View>
                  <Pressable
                    accessibilityLabel={selected ? t("flashcards.card.reviewMistakeNudge.deselectCard") : t("flashcards.card.reviewMistakeNudge.selectCard")}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    onPress={() => toggleCard(card.id)}
                    style={[styles.checkbox, selected && styles.checkboxSelected]}
                  >
                    {selected ? <Ionicons color={colors.lightbg} name="checkmark" size={19} /> : null}
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            {error ? <Text style={styles.error}>{t("flashcards.card.reviewMistakeNudge.error")}</Text> : null}
            <MyButton
              color="my_green"
              disabled={confirming || selectedCount === 0}
              onPress={() => onConfirm([...selectedCardIds])}
              style={styles.confirmButton}
              text={
                confirming
                  ? t("flashcards.card.reviewMistakeNudge.returning")
                  : allSelected
                    ? t("flashcards.card.reviewMistakeNudge.confirm")
                    : t("flashcards.card.reviewMistakeNudge.confirmSelected", { count: selectedCount })
              }
              width="100%"
            />
            <Pressable
              accessibilityRole="button"
              disabled={confirming}
              onPress={onKeepReviewing}
              style={styles.keepButton}
            >
              <Text style={styles.keepText}>{t("flashcards.card.reviewMistakeNudge.keep")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useSettings>["colors"]) =>
  StyleSheet.create({
    backdrop: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.45)", flex: 1, justifyContent: "center", padding: 16 },
    dialog: { backgroundColor: colors.secondBackground, borderColor: colors.border, borderRadius: 24, borderWidth: 1, elevation: 16, maxWidth: 440, overflow: "hidden", shadowColor: "#000", shadowOffset: { height: 12, width: 0 }, shadowOpacity: 0.2, shadowRadius: 24, width: "100%" },
    header: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 20 },
    headerText: { flex: 1, paddingRight: 4 },
    title: { color: colors.headline, fontSize: 20, fontWeight: "900", lineHeight: 26 },
    description: { color: colors.paragraph, fontSize: 14, lineHeight: 20, marginTop: 6 },
    closeButton: { alignItems: "center", backgroundColor: colors.my_red, borderRadius: 7, height: 30, justifyContent: "center", width: 30 },
    list: { flexShrink: 1, marginTop: 16 },
    listContent: { gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
    selectionToggle: { alignSelf: "flex-end", minHeight: 28, justifyContent: "center" },
    selectionToggleText: { color: colors.paragraph, fontSize: 13, fontWeight: "800" },
    card: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, minHeight: 88, overflow: "hidden", padding: 8, paddingRight: 42 },
    thumbnail: { backgroundColor: colors.secondBackground, borderRadius: 11, height: 72, overflow: "hidden", width: 72 },
    promptImage: { height: 72, width: 72 },
    placeholder: { alignItems: "center", justifyContent: "center" },
    cardText: { flex: 1, justifyContent: "center", minWidth: 0 },
    checkbox: { alignItems: "center", borderColor: colors.paragraph, borderRadius: 7, borderWidth: 2, height: 26, justifyContent: "center", position: "absolute", right: 9, top: 9, width: 26 },
    checkboxSelected: { backgroundColor: colors.my_green, borderColor: colors.my_green },
    sideLabel: { color: colors.paragraph, fontSize: 11, fontWeight: "800", letterSpacing: 0.5, marginTop: 2, textTransform: "uppercase" },
    value: { color: colors.headline, fontSize: 15, fontWeight: "700", lineHeight: 19 },
    mathValue: { maxHeight: 42, overflow: "hidden" },
    footer: { borderTopColor: colors.border, borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12 },
    error: { color: colors.my_red, fontSize: 13, fontWeight: "700", marginBottom: 8 },
    confirmButton: { minHeight: 48 },
    keepButton: { alignItems: "center", minHeight: 44, justifyContent: "center" },
    keepText: { color: colors.paragraph, fontSize: 14, fontWeight: "800" },
  });
