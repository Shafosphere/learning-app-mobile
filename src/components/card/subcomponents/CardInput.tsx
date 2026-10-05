import { InlineConfirmButton } from "./InlineConfirmButton";
import { useStudyInputReveal } from "@/src/components/flashcards/StudyInputRevealContext";
import Octicons from "@expo/vector-icons/Octicons";
import { getDateInputPlaceholder, type DatePattern } from "@/src/utils/dateInput";
import { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import TextTicker from "react-native-text-ticker";
import { useStyles } from "../card-styles";
import { useSettings } from "@/src/contexts/SettingsContext";
import type { ResponsiveFlashcardMetrics } from "../responsiveCardWidth";
import type { FocusTarget, InlineCardAction } from "../card-types";
import { CardMathText, hasMathSegments } from "./CardMathText";
import { PromptImage } from "./PromptImage";
import type { FlashcardsImageSize } from "@/src/contexts/SettingsContext";
import { useTranslation } from "react-i18next";
import { buildPromptImageStyle, getInitialPromptImageSlotWidth } from "../promptImageSizing";

const MARQUEE_DELAY_MS = 800;
const MARQUEE_SPEED_PER_PIXEL_MS = 20;
const MIN_DURATION_MS = 4000;
const REPEAT_SPACER_PX = 14;
const AVG_CHAR_WIDTH_FACTOR = 0.65;

type CardInputProps = {
  inlineAction?: InlineCardAction;
  promptText: string;
  emptyAnswerSubmitWarning?: boolean;
  allowMultilinePrompt: boolean;
  promptImageUri?: string | null;
  answer: string;
  setAnswer: (text: string) => void;
  mainInputRef: React.RefObject<TextInput | null>;
  suggestionProps: any;
  handleConfirm: () => void;
  isMainAnswerNumeric: boolean;
  isMainAnswerDate: boolean;
  mainDatePattern?: DatePattern | null;
  focusTarget: FocusTarget;
  requestFocus: (target: FocusTarget) => void;
  onMainInputFocus?: () => void;
  onMainInputBlur?: () => void;
  canToggleTranslations: boolean;
  next: () => void;
  typoDiff?: {
    type: "substitution" | "insertion" | "deletion";
    index: number;
    expectedChar: string;
    inputChar: string;
  } | null;
  imageSizeMode: FlashcardsImageSize;
  textColorOverride?: string;
  cardMetrics: ResponsiveFlashcardMetrics;
};

export function CardInput({
  inlineAction,
  promptText,
  emptyAnswerSubmitWarning = false,
  allowMultilinePrompt,
  promptImageUri,
  answer,
  setAnswer,
  mainInputRef,
  suggestionProps,
  handleConfirm,
  isMainAnswerNumeric,
  isMainAnswerDate,
  mainDatePattern,
  focusTarget,
  requestFocus,
  onMainInputFocus,
  onMainInputBlur,
  canToggleTranslations,
  next,
  typoDiff,
  imageSizeMode,
  textColorOverride,
  cardMetrics,
}: CardInputProps) {
  const styles = useStyles();
  const { ref: inputRowRef, onFocus: revealOnFocus, onBlur: revealOnBlur, onLayout: revealOnLayout } = useStudyInputReveal();
  const { colors } = useSettings();
  const { t } = useTranslation();
  const contentScale = cardMetrics.contentScale;
  const hasMath = useMemo(() => hasMathSegments(promptText), [promptText]);
  const shouldMarqueePrompt =
    !hasMath && !allowMultilinePrompt && promptText.length > 18;
  const promptTextStyle = useMemo(
    () => [
      styles.cardFont,
      {
        fontSize: cardMetrics.fontSize,
        lineHeight: cardMetrics.lineHeight,
      },
      styles.promptMarqueeText,
      textColorOverride ? { color: textColorOverride } : null,
    ],
    [cardMetrics.fontSize, cardMetrics.lineHeight, styles, textColorOverride]
  );
  const flattenedPromptTextStyle = useMemo(
    () => (StyleSheet.flatten(promptTextStyle) || {}) as any,
    [promptTextStyle]
  );
  const promptFontSize =
    typeof flattenedPromptTextStyle.fontSize === "number"
      ? flattenedPromptTextStyle.fontSize
      : 16;
  const estimatedPromptWidth = useMemo(
    () =>
      Math.max(
        1,
        Math.ceil(promptText.length * promptFontSize * AVG_CHAR_WIDTH_FACTOR)
      ),
    [promptText.length, promptFontSize]
  );
  const marqueeDuration = useMemo(
    () =>
      Math.max(MIN_DURATION_MS, estimatedPromptWidth * MARQUEE_SPEED_PER_PIXEL_MS),
    [estimatedPromptWidth]
  );
  const promptImageStyle = useMemo(
    () => buildPromptImageStyle(imageSizeMode, cardMetrics),
    [cardMetrics, imageSizeMode]
  );
  const datePlaceholder = useMemo(
    () => getDateInputPlaceholder(mainDatePattern),
    [mainDatePattern]
  );
  const renderDateMask = useCallback(
    (value: string, mask: string) => {
      const typedPrefix = value.slice(0, mask.length);
      const remainingMask = mask.slice(typedPrefix.length);

      return (
        <Text
          style={[
            styles.dateInputMask,
            {
              height: cardMetrics.textInputHeight,
              fontSize: cardMetrics.fontSize,
              lineHeight: cardMetrics.textInputHeight,
            },
          ]}
          numberOfLines={1}
        >
          {typedPrefix.length > 0 ? (
            <Text style={{ color: "transparent" }}>{typedPrefix}</Text>
          ) : null}
          {remainingMask}
        </Text>
      );
    },
    [
      cardMetrics.fontSize,
      cardMetrics.textInputHeight,
      styles.dateInputMask,
    ],
  );

  const renderedInput = useMemo(() => {
    const inputFrameStyle = {
      height: cardMetrics.textInputHeight,
    };
    const textInputStyle = {
      height: cardMetrics.textInputHeight,
      fontSize: cardMetrics.fontSize,
      lineHeight: cardMetrics.inputLineHeight,
      borderBottomWidth: 3 * contentScale,
    };
    if (!typoDiff) {
      return (
        <View style={{ width: "100%", position: "relative" }}>
          {datePlaceholder ? renderDateMask(answer, datePlaceholder) : null}
          <TextInput
            style={[
              styles.cardInput,
            styles.cardFont,
            inputFrameStyle,
            textInputStyle,
            emptyAnswerSubmitWarning && {
              borderColor: colors.my_yellow,
              borderWidth: 2,
              borderRadius: 6,
            },
            textColorOverride ? { color: textColorOverride } : null,
          ]}
            value={answer}
            accessibilityLabel={t("flashcards.card.input.answerLabel")}
            accessibilityHint={t(
              emptyAnswerSubmitWarning
                ? "flashcards.card.input.emptyAnswerHint"
                : "flashcards.card.input.answerHint",
            )}
            onChangeText={setAnswer}
            autoCapitalize="none"
            {...suggestionProps}
            keyboardType={
              isMainAnswerDate
                ? "number-pad"
                : isMainAnswerNumeric
                  ? "decimal-pad"
                  : suggestionProps?.keyboardType
            }
            ref={mainInputRef}
            returnKeyType="done"
            blurOnSubmit={false}
            onSubmitEditing={handleConfirm}
            onFocus={() => {
              revealOnFocus();
              onMainInputFocus?.();
              requestFocus("main");
            }}
            onBlur={() => {
              revealOnBlur();
              onMainInputBlur?.();
            }}
          />
          {emptyAnswerSubmitWarning ? (
            <Text testID="card-answer-error" style={styles.inputAccessibilityError}>
              {t("flashcards.card.input.emptyAnswerError")}
            </Text>
          ) : null}
        </View>
      );
    }

    // Rich text rendering for typo
    const { index, type, inputChar, expectedChar } = typoDiff;
    const beforeCursor = answer.slice(0, index);

    // Default: substitution behavior
    let errorPart: React.ReactNode = null;
    let correctionPart: React.ReactNode = null;
    let afterCursor = answer.slice(index + 1);

    if (type === "substitution") {
      errorPart = <Text style={styles.typoError}>{inputChar}</Text>;
      correctionPart = (
        <Text style={styles.typoCorrection}>{expectedChar}</Text>
      );
    } else if (type === "insertion") {
      // Input has extra char at index
      // Show extra char as error. Capture full mismatch
      errorPart = <Text style={styles.typoError}>{inputChar}</Text>;
      correctionPart = null; // No "correction" to add, just remove
      // The rest of the string starts after this inserted char
    } else if (type === "deletion") {
      // Input missed a char at index.
      // Nothing to strike through (it's missing).
      // Show missing char in yellow.
      // Input slice is actually valid up to index.
      afterCursor = answer.slice(index); // Since 'index' in input is the start of the rest
      errorPart = null;
      correctionPart = (
        <Text style={styles.typoCorrection}>{expectedChar}</Text>
      );
    }

    return (
      <View
        style={[
          styles.cardInput,
          inputFrameStyle,
          {
            width: "100%",
            flexDirection: "row",
            alignItems: "center",
          },
        ]}
      >
        <Text
          style={[
            styles.cardFont,
            {
              fontSize: cardMetrics.fontSize,
              lineHeight: cardMetrics.lineHeight,
            },
            textColorOverride ? { color: textColorOverride } : null,
          ]}
        >
          {beforeCursor}
          {errorPart}
          {correctionPart}
          {afterCursor}
        </Text>
      </View>
    );
  }, [
    answer,
    colors.my_yellow,
    emptyAnswerSubmitWarning,
    handleConfirm,
    suggestionProps,
    mainInputRef,
    onMainInputBlur,
    onMainInputFocus,
    revealOnFocus,
    revealOnBlur,
    requestFocus,
    setAnswer,
    isMainAnswerDate,
    isMainAnswerNumeric,
    datePlaceholder,
    renderDateMask,
    styles,
    textColorOverride,
    typoDiff,
    contentScale,
    cardMetrics.fontSize,
    cardMetrics.inputLineHeight,
    cardMetrics.lineHeight,
    cardMetrics.textInputHeight,
    t,
  ]);

  const imageBlock = promptImageUri ? (
    <PromptImage
      key={promptImageUri}
      uri={promptImageUri}
      imageStyle={[styles.promptImage, promptImageStyle]}
      initialSlotWidth={getInitialPromptImageSlotWidth(cardMetrics.width, 8)}
    />
  ) : null;
  const hasPromptText = promptText.trim().length > 0;

  const promptTextBlock = hasMath ? (
    <CardMathText
      text={promptText}
      textStyle={[
        styles.cardFont,
        {
          fontSize: cardMetrics.fontSize,
          lineHeight: cardMetrics.lineHeight,
        },
        styles.promptText,
        allowMultilinePrompt && styles.promptTextMultiline,
        textColorOverride ? { color: textColorOverride } : null,
      ]}
    />
  ) : shouldMarqueePrompt ? (
    <View style={styles.promptScroll}>
      <TextTicker
        key={promptText}
        style={promptTextStyle}
        animationType="auto"
        duration={marqueeDuration + REPEAT_SPACER_PX}
        repeatSpacer={REPEAT_SPACER_PX}
        marqueeDelay={MARQUEE_DELAY_MS}
        loop
        useNativeDriver={false}
        numberOfLines={1}
      >
        {promptText}
      </TextTicker>
    </View>
  ) : (
    <Text
      style={[
        styles.cardFont,
        {
          fontSize: cardMetrics.fontSize,
          lineHeight: cardMetrics.lineHeight,
        },
        styles.promptText,
        allowMultilinePrompt && styles.promptTextMultiline,
        textColorOverride ? { color: textColorOverride } : null,
      ]}
      numberOfLines={allowMultilinePrompt ? undefined : 1}
      ellipsizeMode={allowMultilinePrompt ? "clip" : "tail"}
    >
      {promptText}
    </Text>
  );

  const inputWithAction = (
    <View ref={inputRowRef} onLayout={revealOnLayout} collapsable={false} style={{ flexDirection: "row", alignItems: "center", gap: inlineAction ? 8 : 0, width: "100%" }}>
      <View style={{ flex: 1, minWidth: 0 }}>{renderedInput}</View>
      {inlineAction ? (
        <InlineConfirmButton
          disabled={inlineAction.disabled}
          label={inlineAction.label}
          onPress={handleConfirm}
        />
      ) : null}
    </View>
  );

  const content = (
    <>
      <View
        style={[
          styles.topContainer,
          allowMultilinePrompt && styles.topContainerLarge,
          promptImageUri && allowMultilinePrompt && { justifyContent: "center" },
        ]}
      >
        <View style={{ width: "100%", gap: 8 * contentScale }}>
          {promptImageUri ? imageBlock : null}
          {hasPromptText ? (
            <View style={styles.promptRow}>
              {promptTextBlock}
              {canToggleTranslations ? (
                <Pressable
                  style={[styles.cardIconWrapper, { width: 32 * contentScale }]}
                  onPress={next}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t(
                    "flashcards.card.accessibilityLabel.przelaczStroneFiszki"
                  )}
                >
                  <Octicons
                    name="discussion-duplicate"
                    size={24 * contentScale}
                    color={
                      textColorOverride ?? (styles.cardFont as any).color
                    }
                  />
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      {allowMultilinePrompt ? (
        <View
          style={styles.inputContainerLarge}
        >
          {inputWithAction}
        </View>
      ) : (
        inputWithAction
      )}
    </>
  );

  if (allowMultilinePrompt) {
    return (
      <View
        style={[
          styles.cardContentLarge,
          {
            paddingVertical: 10 * contentScale,
            gap: 10 * contentScale,
          },
        ]}
      >
        {content}
      </View>
    );
  }

  return content;
}
