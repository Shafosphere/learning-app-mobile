import { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import { isAnswerOnlyCard } from "@/src/utils/flashcardDirection";
import { NudgeModal } from "@/src/components/nudge/NudgeModal";
import { usePeekStyles } from "./Peek-styles";
import Octicons from "@expo/vector-icons/Octicons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  SectionList,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";

type FlashcardsPeekOverlayProps = {
  visible: boolean;
  boxKey: keyof BoxesState | null;
  cards: WordWithTranslations[];
  cardLayout?: "box-aware" | "uniform";
  upcomingCards?: WordWithTranslations[];
  upcomingLoading?: boolean;
  upcomingError?: boolean;
  activeCourseName?: string | null;
  onClose: () => void;
  onReturnToUnknown: (cardId: number) => Promise<void>;
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
  cardLayout = "box-aware",
  upcomingCards,
  upcomingLoading = false,
  upcomingError = false,
  activeCourseName,
  onClose,
  onReturnToUnknown,
}: FlashcardsPeekOverlayProps) {
  const { t } = useTranslation();
  const styles = usePeekStyles();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const listRef = useRef<SectionList<WordWithTranslations>>(null);
  const { width, height } = useWindowDimensions();
  const [cardPendingReset, setCardPendingReset] =
    useState<WordWithTranslations | null>(null);
  const [isResettingCard, setIsResettingCard] = useState(false);
  const [resetErrorVisible, setResetErrorVisible] = useState(false);
  const [, setCountdownTick] = useState(0);

  const sheetWidth = Math.min(width - 32, 480);
  const boxLabel = boxKey ? BOX_LABELS[boxKey] ?? "?" : "?";

  useEffect(() => {
    if (visible) {
      // Reset scroll position
      requestAnimationFrame(() => {
        listRef.current?.getScrollResponder()?.scrollTo({
          y: 0,
          animated: false,
        });
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

  useEffect(() => {
    if (!visible) {
      setCardPendingReset(null);
      setIsResettingCard(false);
      setResetErrorVisible(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || upcomingCards === undefined) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active = true;

    const scheduleNextUpdate = () => {
      const now = Date.now();
      const nextDelay = upcomingCards.reduce<number | undefined>(
        (earliestDelay, card) => {
          if (typeof card.nextReview !== "number") return earliestDelay;

          const remainingMs = card.nextReview - now;
          if (remainingMs <= 0) return earliestDelay;

          const remainingMinutes = Math.ceil(remainingMs / 60_000);
          const delay =
            remainingMs - (remainingMinutes - 1) * 60_000;
          return earliestDelay === undefined
            ? delay
            : Math.min(earliestDelay, delay);
        },
        undefined
      );

      if (nextDelay === undefined) return;
      timer = setTimeout(() => {
        if (!active) return;
        setCountdownTick((value) => value + 1);
        scheduleNextUpdate();
      }, nextDelay);
    };

    scheduleNextUpdate();
    return () => {
      active = false;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [upcomingCards, visible]);

  const closeOverlay = () => {
    if (isResettingCard) return;
    setCardPendingReset(null);
    setResetErrorVisible(false);
    onClose();
  };

  const openResetConfirmation = (card: WordWithTranslations) => {
    setCardPendingReset(card);
    setResetErrorVisible(false);
  };

  const closeResetConfirmation = () => {
    if (isResettingCard) return;
    setCardPendingReset(null);
    setResetErrorVisible(false);
  };

  const confirmReturnToUnknown = async () => {
    if (!cardPendingReset || isResettingCard) return;
    setIsResettingCard(true);
    setResetErrorVisible(false);
    try {
      await onReturnToUnknown(cardPendingReset.id);
      setCardPendingReset(null);
    } catch (error) {
      console.warn("[FlashcardsPeek] Failed to return card to unknown pool", error);
      setResetErrorVisible(true);
    } finally {
      setIsResettingCard(false);
    }
  };

  const formatCountdown = (nextReview?: number) => {
    if (typeof nextReview !== "number") {
      return t("flashcards.card.peek.soonUnknown");
    }
    const remainingMinutes = Math.max(
      0,
      Math.ceil((nextReview - Date.now()) / 60_000)
    );
    if (remainingMinutes === 0) {
      return t("flashcards.card.peek.soonNow");
    }
    const days = Math.floor(remainingMinutes / (24 * 60));
    const hours = Math.floor((remainingMinutes % (24 * 60)) / 60);
    const minutes = remainingMinutes % 60;
    if (days > 0) {
      return hours > 0
        ? t("flashcards.card.peek.soonInDaysHours", { days, hours })
        : t("flashcards.card.peek.soonInDays", { days });
    }
    if (hours > 0) {
      return minutes > 0
        ? t("flashcards.card.peek.soonInHoursMinutes", { hours, minutes })
        : t("flashcards.card.peek.soonInHours", { hours });
    }
    return t("flashcards.card.peek.soonInMinutes", {
      minutes: remainingMinutes,
    });
  };

  const renderCard = (
    item: WordWithTranslations,
    index: number,
    isUpcoming: boolean
  ) => {
    const isBoxZero = boxKey === "boxZero";
    const useBoxZeroSideLayout =
      isBoxZero && cardLayout === "box-aware";
    const boxIsReversed = boxKey === "boxTwo" || boxKey === "boxFour";
    const shouldFlip =
      Boolean(item.flipped) && !isAnswerOnlyCard(item);
    const prompt =
      boxIsReversed && shouldFlip ? item.translations?.[0] ?? "" : item.text;
    const type = item.type ?? "text";
    const promptImage = boxIsReversed && shouldFlip ? item.imageBack : item.imageFront;
    const answerImage = boxIsReversed && shouldFlip ? item.imageFront : item.imageBack;
    const hasPromptImage = Boolean(promptImage);
    const hasAnswerImage = Boolean(answerImage);
    const displayPrompt =
      prompt?.trim() || (hasPromptImage ? "" : t("flashcards.card.peek.emptyContent"));
    const translations =
      item.translations?.map((t) => t?.trim()).filter(Boolean) ?? [];
    const mainTranslation =
      translations[0] ?? t("flashcards.card.peek.emptyTranslation");
    const isBooleanType = type === "true_false" || type === "know_dont_know";
    const isKnowDontKnow = type === "know_dont_know";
    const extraTranslations = isBooleanType ? [] : translations.slice(1);
    const normalizedTrueFalse = translations[0]?.toLowerCase() ?? "";
    const trueFalseAnswer =
      isKnowDontKnow
        ? t("repeats.cardTypes.knowDontKnow")
        : normalizedTrueFalse === "true"
          ? t("flashcards.card.peek.true")
          : normalizedTrueFalse === "false"
            ? t("flashcards.card.peek.false")
            : translations[0]?.trim() || t("flashcards.card.peek.emptyAnswer");
    const typeLabel =
      isBooleanType
        ? isKnowDontKnow
          ? t("repeats.cardTypes.knowDontKnow")
          : t("repeats.cardTypes.trueFalse")
        : t("flashcards.card.peek.textType");
    const showPromptImageOnly =
      hasPromptImage && !displayPrompt;
    const showBoxZeroAnswer = isBoxZero;

    return (
      <View style={styles.cardWrapper}>
        {isUpcoming ? (
          <View style={styles.soonBadge}>
            <Octicons name="clock" size={13} color={styles.soonBadgeText.color} />
            <Text style={styles.soonBadgeText}>
              {formatCountdown(item.nextReview)}
            </Text>
          </View>
        ) : null}
        {useBoxZeroSideLayout ? (
          <View style={[styles.cardContent, styles.cardContentBoxZero]}>
            <View style={styles.cardSide}>
              <Text style={styles.cardSideLabel}>{t("flashcards.card.peek.flashcard")}</Text>
              <Text style={styles.cardSideIndex}>#{index + 1}</Text>
            </View>

            <View style={styles.cardMain}>
              <View style={styles.cardMetaRow}>
                <View style={styles.typePill}>
                  <Text style={styles.typePillText}>{typeLabel}</Text>
                </View>
                {hasPromptImage ? (
                  <View style={styles.typePill}>
                    <Text style={styles.typePillText}>{t("flashcards.card.peek.image")}</Text>
                  </View>
                ) : null}
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
                  <Text style={styles.cardTag}>{t("flashcards.card.peek.front")}</Text>
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
                      <Text style={styles.cardEmptyValue}>{t("flashcards.card.peek.emptyContent")}</Text>
                    ) : null}
                  </View>
                </View>
              )}
              <View style={styles.cardLine}>
                <Text style={[styles.cardTag]}>{t("flashcards.card.peek.back")}</Text>
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
                        isBooleanType ? styles.cardTrueFalse : undefined,
                      ]}
                      numberOfLines={hasAnswerImage ? 3 : 2}
                      ellipsizeMode="tail"
                    >
                      {isBooleanType ? trueFalseAnswer : mainTranslation}
                    </Text>
                    {!hasAnswerImage && !mainTranslation ? (
                      <Text style={styles.cardEmptyValue}>{t("flashcards.card.peek.emptyTranslation")}</Text>
                    ) : null}
                  </View>
              </View>
              {extraTranslations.length ? (
                <Text style={styles.cardAlternatives}>
                  <Text style={styles.cardAlternativesLabel}>
                    {t("flashcards.card.peek.otherCorrect")}{" "}
                  </Text>
                  {extraTranslations.join(", ")}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={[styles.cardContentSimple]}>
            <View style={styles.cardMetaRow}>
              <Text style={styles.cardSimpleIndex}>
                {t("flashcards.card.peek.flashcardNumber", { number: index + 1 })}
              </Text>
              <View style={styles.cardMetaTags}>
                <View style={styles.typePill}>
                  <Text style={styles.typePillText}>{typeLabel}</Text>
                </View>
                {hasPromptImage ? (
                  <View style={styles.typePill}>
                    <Text style={styles.typePillText}>{t("flashcards.card.peek.image")}</Text>
                  </View>
                ) : null}
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
                  <Text style={styles.cardTag}>{t("flashcards.card.peek.question")}</Text>
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
                      <Text style={styles.cardEmptyValue}>{t("flashcards.card.peek.emptyContent")}</Text>
                    ) : null}
                  </View>
                </>
              )}
            </View>
            {showBoxZeroAnswer ? (
              <>
                <View style={styles.cardLine}>
                  <Text style={styles.cardTag}>{t("flashcards.card.peek.answer")}</Text>
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
                        isBooleanType ? styles.cardTrueFalse : undefined,
                      ]}
                      numberOfLines={hasAnswerImage ? 3 : 2}
                      ellipsizeMode="tail"
                    >
                      {isBooleanType ? trueFalseAnswer : mainTranslation}
                    </Text>
                  </View>
                </View>
                {extraTranslations.length ? (
                  <Text style={styles.cardAlternatives}>
                    <Text style={styles.cardAlternativesLabel}>
                      {t("flashcards.card.peek.otherCorrect")}{" "}
                    </Text>
                    {extraTranslations.join(", ")}
                  </Text>
                ) : null}
              </>
            ) : null}
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("flashcards.card.peek.returnToUnknownA11y")}
          testID={`flashcards-peek-return-unknown-${item.id}`}
          onPress={() => openResetConfirmation(item)}
          hitSlop={8}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed ? styles.deleteButtonPressed : undefined,
          ]}
        >
          <Octicons name="trash" size={18} color={styles.deleteIcon.color} />
        </Pressable>
      </View>
    );
  };

  const supportsUpcoming = upcomingCards !== undefined;
  const upcoming = upcomingCards ?? [];
  const totalCount = cards.length + upcoming.length;
  const hintText = totalCount ? t("flashcards.card.peek.listHint") : "";
  const countLabel = totalCount
    ? t(
        totalCount === 1
          ? "flashcards.card.peek.countOne"
          : "flashcards.card.peek.countMany",
        { count: totalCount }
      )
    : t("flashcards.card.peek.emptyCount");
  const courseLabel = activeCourseName?.trim() || t("flashcards.card.peek.previewCourse");

  return (
    <>
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={closeOverlay}
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
                <Text style={styles.title}>{t("flashcards.card.peek.boxTitle", { box: boxLabel })}</Text>
                {hintText ? (
                  <Text style={styles.subtitle}>{hintText}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={closeOverlay}
                accessibilityRole="button"
                accessibilityLabel={t("flashcards.card.peek.close")}
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
                {totalCount ? `${courseLabel}` : ""}
              </Text>
            </View>
          </View>

          {/* Body */}
          <View style={styles.sectionBody}>
            {totalCount === 0 && !upcomingLoading && !upcomingError ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrapper}>
                  <Octicons
                    name="inbox"
                    size={32}
                    color={styles.emptyIcon.color}
                  />
                </View>
                <Text style={styles.emptyTitle}>{t("flashcards.card.peek.emptyBoxTitle")}</Text>
                <Text style={styles.emptyDescription}>
                  {t("flashcards.card.peek.emptyBoxDescription")}
                </Text>
              </View>
            ) : supportsUpcoming ? (
              <SectionList
                ref={listRef}
                sections={[
                  ...(cards.length
                    ? [{ title: t("flashcards.card.peek.readyNow"), data: cards, upcoming: false }]
                    : []),
                  ...(upcoming.length
                    ? [{ title: t("flashcards.card.peek.soon"), data: upcoming, upcoming: true }]
                    : []),
                ]}
                keyExtractor={(item, idx) =>
                  `${item.id}-${item.type ?? "text"}-${idx}`
                }
                renderSectionHeader={({ section }) => (
                  <Text style={styles.groupTitle}>{section.title}</Text>
                )}
                renderItem={({ item, index, section }) =>
                  renderCard(item, index, section.upcoming)
                }
                ListFooterComponent={
                  <>
                    {upcomingLoading ? (
                      <Text style={styles.peekStatus}>
                        {t("flashcards.card.peek.soonLoading")}
                      </Text>
                    ) : null}
                    {upcomingError ? (
                      <Text style={styles.peekError}>
                        {t("flashcards.card.peek.soonError")}
                      </Text>
                    ) : null}
                    <View style={styles.cardsListFooter} />
                  </>
                }
                showsVerticalScrollIndicator={false}
                style={styles.cardsList}
                contentContainerStyle={styles.cardsListContent}
              />
            ) : (
              <SectionList
                ref={listRef}
                sections={[{ title: "", data: cards, upcoming: false }]}
                keyExtractor={(item, idx) =>
                  `${item.id}-${item.type ?? "text"}-${idx}`
                }
                renderSectionHeader={() => null}
                renderItem={({ item, index }) => renderCard(item, index, false)}
                ListFooterComponent={<View style={styles.cardsListFooter} />}
                showsVerticalScrollIndicator={false}
                style={styles.cardsList}
                contentContainerStyle={styles.cardsListContent}
              />
            )}
          </View>
          </Animated.View>
        </View>
      </Modal>
      <NudgeModal
        visible={cardPendingReset != null}
        title={t("flashcards.card.peek.returnToUnknownTitle")}
        description={t("flashcards.card.peek.returnToUnknownDescription")}
        confirmLabel={t("flashcards.card.peek.returnToUnknownConfirm")}
        confirmDisabled={isResettingCard}
        secondaryLabel={t("app.actions.cancel")}
        onSecondaryPress={closeResetConfirmation}
        onConfirm={() => void confirmReturnToUnknown()}
        onClose={closeResetConfirmation}
      >
        {resetErrorVisible ? (
          <Text style={styles.resetError}>
            {t("flashcards.card.peek.returnToUnknownError")}
          </Text>
        ) : null}
      </NudgeModal>
    </>
  );
}
