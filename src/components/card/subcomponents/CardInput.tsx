import Octicons from "@expo/vector-icons/Octicons";
import { getDateInputPlaceholder, type DatePattern } from "@/src/utils/dateInput";
import { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, ImageStyle } from "react-native";
import TextTicker from "react-native-text-ticker";
import { useStyles, PROMPT_IMAGE_MAX_HEIGHT } from "../card-styles";
import type { FocusTarget } from "../card-types";
import { CardMathText, hasMathSegments } from "./CardMathText";
import { PromptImage } from "./PromptImage";
import type { FlashcardsImageSize } from "@/src/contexts/SettingsContext";

const MARQUEE_DELAY_MS = 800;
const MARQUEE_SPEED_PER_PIXEL_MS = 20;
const MIN_DURATION_MS = 4000;
const REPEAT_SPACER_PX = 14;
const AVG_CHAR_WIDTH_FACTOR = 0.65;

const IMAGE_SIZE_MULTIPLIER: Record<FlashcardsImageSize, number> = {
  dynamic: 1,
  small: 0.4,
  medium: 0.6,
  large: 1,
  very_large: 1.7,
};

const buildPromptImageStyle = (mode: FlashcardsImageSize): ImageStyle => {
  const fraction = IMAGE_SIZE_MULTIPLIER[mode] ?? 1;
  const target = PROMPT_IMAGE_MAX_HEIGHT * fraction;
  return { height: target, maxHeight: target };
};

type CardInputProps = {
  promptText: string;
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
};

export function CardInput({
  promptText,
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
  canToggleTranslations,
  next,
  typoDiff,
  imageSizeMode,
  textColorOverride,
}: CardInputProps) {
  const styles = useStyles();
  const hasMath = useMemo(() => hasMathSegments(promptText), [promptText]);
  const shouldMarqueePrompt =
    !hasMath && !allowMultilinePrompt && promptText.length > 18;
  const promptTextStyle = useMemo(
    () => [
      styles.cardFont,
      styles.promptMarqueeText,
      textColorOverride ? { color: textColorOverride } : null,
    ],
    [styles, textColorOverride]
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
    () => buildPromptImageStyle(imageSizeMode),
    [imageSizeMode]
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
        <Text style={styles.dateInputMask} numberOfLines={1}>
          {typedPrefix.length > 0 ? (
            <Text style={{ color: "transparent" }}>{typedPrefix}</Text>
          ) : null}
          {remainingMask}
        </Text>
      );
    },
    [styles.dateInputMask],
  );

  const renderedInput = useMemo(() => {
    if (!typoDiff) {
      return (
        <View style={{ width: "100%", position: "relative" }}>
          {datePlaceholder ? renderDateMask(answer, datePlaceholder) : null}
          <TextInput
            style={[
              styles.cardInput,
              styles.cardFont,
              textColorOverride ? { color: textColorOverride } : null,
            ]}
            value={answer}
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
            onFocus={() => requestFocus("main")}
          />
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
      <View style={[styles.cardInput, { width: "100%", flexDirection: "row", alignItems: "center" }]}>
        <Text
          style={[
            styles.cardFont,
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
    focusTarget,
    suggestionProps,
    handleConfirm,
    mainInputRef,
    requestFocus,
    setAnswer,
    isMainAnswerDate,
    isMainAnswerNumeric,
    datePlaceholder,
    renderDateMask,
    styles,
    textColorOverride,
    typoDiff,
  ]);

  const imageBlock = promptImageUri ? (
    <PromptImage
      key={promptImageUri}
      uri={promptImageUri}
      imageStyle={[styles.promptImage, promptImageStyle]}
    />
  ) : null;
  const hasPromptText = promptText.trim().length > 0;

  const promptTextBlock = hasMath ? (
    <CardMathText
      text={promptText}
      textStyle={[
        styles.cardFont,
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

  const content = (
    <>
      <View
        style={[
          styles.topContainer,
          allowMultilinePrompt && styles.topContainerLarge,
          promptImageUri && allowMultilinePrompt && { justifyContent: "center" },
        ]}
      >
        <View
          style={{ width: "100%", gap: 8 }}
        >
          {promptImageUri ? imageBlock : null}
          {hasPromptText ? (
            <View style={styles.promptRow}>
              {promptTextBlock}
              {canToggleTranslations ? (
                <Pressable style={styles.cardIconWrapper} onPress={next} hitSlop={8}>
                  <Octicons
                    name="discussion-duplicate"
                    size={24}
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
        <View style={styles.inputContainerLarge}>
          {renderedInput}
        </View>
      ) : (
        renderedInput
      )}
    </>
  );

  if (allowMultilinePrompt) {
    return <View style={styles.cardContentLarge}>{content}</View>;
  }

  return content;
}
