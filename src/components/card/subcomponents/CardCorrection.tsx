import type { FlashcardsImageSize } from "@/src/contexts/SettingsContext";
import type { DatePattern } from "@/src/utils/dateInput";
import Octicons from "@expo/vector-icons/Octicons";
import { useMemo } from "react";
import type { CardCorrectionType, FocusTarget } from "../card-types";
import {
  ImageStyle,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import TextTicker from "react-native-text-ticker";
import { PROMPT_IMAGE_MAX_HEIGHT, useStyles } from "../card-styles";
import { CardMathText, hasMathSegments } from "./CardMathText";
import { PromptImage } from "./PromptImage";

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

type CardCorrectionProps = {
  correction: CardCorrectionType;
  promptText: string;
  promptImageUri?: string | null;
  correctionAwers: string;
  correctionRewers: string;
  answerOnly: boolean;
  showAwersInput: boolean;
  showRewersInput: boolean;
  allowMultilinePrompt: boolean;
  input1Ref: React.RefObject<TextInput | null>;
  input2Ref: React.RefObject<TextInput | null>;
  input1ScrollRef: React.RefObject<ScrollView | null>;
  input2ScrollRef: React.RefObject<ScrollView | null>;
  handleCorrectionInput1Change: (text: string) => void;
  wrongInputChange: (which: 1 | 2, value: string) => void;
  suggestionProps: any;
  isIntroMode: boolean;
  renderOverlayText: (value: string, expected: string) => React.ReactNode;
  input1ContentWidth: number;
  input2ContentWidth: number;
  setInput1LayoutWidth: (width: number) => void;
  setInput2LayoutWidth: (width: number) => void;
  focusTarget: FocusTarget;
  requestFocus: (target: FocusTarget) => void;
  onCorrection1Completed: () => void;
  isCorrectionInput1Numeric: boolean;
  isCorrectionInput1Date: boolean;
  correctionInput1DatePattern?: DatePattern | null;
  isCorrectionInput2Numeric: boolean;
  isCorrectionInput2Date: boolean;
  correctionInput2DatePattern?: DatePattern | null;
  previousCorrectionInput2: React.MutableRefObject<string>;
  canToggleTranslations: boolean;
  next: () => void;
  input1LayoutWidth: number;
  input2LayoutWidth: number;
  imageSizeMode: FlashcardsImageSize;
  textColorOverride?: string;
};

export function CardCorrection({
  correction,
  promptText,
  promptImageUri,
  correctionAwers,
  correctionRewers,
  answerOnly,
  showAwersInput,
  showRewersInput,
  allowMultilinePrompt,
  input1Ref,
  input2Ref,
  input1ScrollRef,
  input2ScrollRef,
  handleCorrectionInput1Change,
  wrongInputChange,
  suggestionProps,
  isIntroMode,
  renderOverlayText,
  input1ContentWidth,
  input2ContentWidth,
  setInput1LayoutWidth,
  setInput2LayoutWidth,
  focusTarget,
  requestFocus,
  onCorrection1Completed,
  isCorrectionInput1Numeric,
  isCorrectionInput1Date,
  correctionInput1DatePattern,
  isCorrectionInput2Numeric,
  isCorrectionInput2Date,
  correctionInput2DatePattern,
  previousCorrectionInput2,
  canToggleTranslations,
  next,
  input1LayoutWidth,
  input2LayoutWidth,
  imageSizeMode,
  textColorOverride,
}: CardCorrectionProps) {
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
    [styles, textColorOverride],
  );
  const flattenedPromptTextStyle = useMemo(
    () => (StyleSheet.flatten(promptTextStyle) || {}) as any,
    [promptTextStyle],
  );
  const promptFontSize =
    typeof flattenedPromptTextStyle.fontSize === "number"
      ? flattenedPromptTextStyle.fontSize
      : 16;
  const estimatedPromptWidth = useMemo(
    () =>
      Math.max(
        1,
        Math.ceil(promptText.length * promptFontSize * AVG_CHAR_WIDTH_FACTOR),
      ),
    [promptText.length, promptFontSize],
  );
  const marqueeDuration = useMemo(
    () =>
      Math.max(
        MIN_DURATION_MS,
        estimatedPromptWidth * MARQUEE_SPEED_PER_PIXEL_MS,
      ),
    [estimatedPromptWidth],
  );
  const promptImageStyle = useMemo(
    () => buildPromptImageStyle(imageSizeMode),
    [imageSizeMode],
  );
  function applyPlaceholderCasing(value: string, expected: string): string {
    if (!expected) return value;
    const chars = value.split("");
    const expectedChars = expected.split("");
    const len = Math.min(chars.length, expectedChars.length);
    for (let i = 0; i < len; i++) {
      const current = chars[i];
      const target = expectedChars[i];
      if (!current) continue;
      if (current.toLowerCase() !== target.toLowerCase()) continue;
      const shouldUpper = target === target.toUpperCase();
      const shouldLower = target === target.toLowerCase();
      if (shouldUpper && current !== current.toUpperCase()) {
        chars[i] = current.toUpperCase();
      } else if (shouldLower && current !== current.toLowerCase()) {
        chars[i] = current.toLowerCase();
      }
    }
    return chars.join("");
  }

  const promptContent = hasMath ? (
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

  const promptImage = promptImageUri ? (
    <PromptImage
      key={promptImageUri}
      uri={promptImageUri}
      imageStyle={[styles.promptImage, promptImageStyle]}
      renderMode="correction"
    />
  ) : null;

  const promptBlock = (
    <View
      style={[
        styles.topContainer,
        allowMultilinePrompt && styles.topContainerLarge,
        // Center image if present
        promptImageUri && allowMultilinePrompt && { justifyContent: "center" },
      ]}
    >
      {promptImageUri ? (
        promptImage
      ) : (
        <View style={styles.promptRow}>
          {promptContent}
          {canToggleTranslations && !isIntroMode ? (
            <Pressable
              style={styles.cardIconWrapper}
              onPress={next}
              hitSlop={8}
            >
              <Octicons
                name="discussion-duplicate"
                size={24}
                color={textColorOverride ?? (styles.cardFont as any).color}
              />
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );

  const input1Block = (
    <View
      style={[
        allowMultilinePrompt
          ? styles.containerInputLarge
          : styles.containerInput,
        styles.containerInputFirst,
      ]}
      onLayout={({ nativeEvent }) => {
        const nextWidth = nativeEvent.layout.width;
        if (Math.abs(nextWidth - input1LayoutWidth) > 0.5) {
          setInput1LayoutWidth(nextWidth);
        }
      }}
    >
      <ScrollView
        ref={input1ScrollRef}
        horizontal
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.inputScroll}
        contentContainerStyle={[
          styles.inputScrollContent,
          { width: input1ContentWidth },
        ]}
      >
        <View style={[styles.inputRow, { width: input1ContentWidth }]}>
          <Text
            style={[
              styles.myplaceholder,
              textColorOverride ? { color: textColorOverride } : null,
            ]}
            numberOfLines={1}
            ellipsizeMode="clip"
          >
            {correctionAwers}
          </Text>
          <TextInput
            value={correction.input1}
            onChangeText={(text) =>
              handleCorrectionInput1Change(
                applyPlaceholderCasing(text, correctionAwers),
              )
            }
            style={[
              styles.myinput,
              textColorOverride ? { color: textColorOverride } : null,
            ]}
            ref={input1Ref}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={onCorrection1Completed}
            autoCapitalize="none"
            {...suggestionProps}
            keyboardType={
              isCorrectionInput1Date
                ? "number-pad"
                : isCorrectionInput1Numeric
                  ? "decimal-pad"
                  : suggestionProps?.keyboardType
            }
            onFocus={() => requestFocus("correction1")}
          />
          {correction.input1 ? (
            <Text
              style={styles.inputOverlay}
              numberOfLines={1}
              ellipsizeMode="clip"
            >
              {renderOverlayText(correction.input1, correctionAwers)}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );

  const input2Block = (
    <View
      style={[
        allowMultilinePrompt
          ? styles.containerInputLarge
          : styles.containerInput,
        !allowMultilinePrompt &&
          (answerOnly || !showAwersInput) &&
          styles.containerInputFirst,
      ]}
      onLayout={({ nativeEvent }) => {
        const nextWidth = nativeEvent.layout.width;
        if (Math.abs(nextWidth - input2LayoutWidth) > 0.5) {
          setInput2LayoutWidth(nextWidth);
        }
      }}
    >
      <ScrollView
        ref={input2ScrollRef}
        horizontal
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.inputScroll}
        contentContainerStyle={[
          styles.inputScrollContent,
          { width: input2ContentWidth },
        ]}
      >
        <View style={[styles.inputRow, { width: input2ContentWidth }]}>
          <Text
            style={[
              styles.myplaceholder,
              textColorOverride ? { color: textColorOverride } : null,
            ]}
            numberOfLines={1}
            ellipsizeMode="clip"
          >
            {correctionRewers}
          </Text>
          <TextInput
            value={correction.input2 ?? ""}
            onChangeText={(t) => {
              const adjusted = applyPlaceholderCasing(t, correctionRewers);
              const previousValue = previousCorrectionInput2.current;
              const shouldFocusPrevious =
                !answerOnly &&
                Platform.OS === "android" &&
                previousValue.length === 1 &&
                adjusted.length === 0;
              previousCorrectionInput2.current = adjusted;
              wrongInputChange(2, adjusted);
              if (shouldFocusPrevious) {
                requestFocus("correction1");
              }
            }}
            style={[
              styles.myinput,
              textColorOverride ? { color: textColorOverride } : null,
            ]}
            ref={input2Ref}
            returnKeyType="done"
            autoCapitalize="none"
            {...suggestionProps}
            keyboardType={
              isCorrectionInput2Date
                ? "number-pad"
                : isCorrectionInput2Numeric
                  ? "decimal-pad"
                  : suggestionProps?.keyboardType
            }
            onFocus={() => requestFocus("correction2")}
            onKeyPress={({ nativeEvent }) => {
              if (
                !answerOnly &&
                nativeEvent.key === "Backspace" &&
                (correction.input2 ?? "").length <= 1
              ) {
                requestFocus("correction1");
              }
            }}
          />
          {correction.input2 ? (
            <Text
              style={styles.inputOverlay}
              numberOfLines={1}
              ellipsizeMode="clip"
            >
              {renderOverlayText(correction.input2 ?? "", correctionRewers)}
            </Text>
          ) : null}
        </View>
      </ScrollView>
      {isIntroMode && canToggleTranslations ? (
        <Pressable
          style={[styles.cardIconWrapper, styles.introToggle]}
          onPress={next}
          hitSlop={8}
        >
          <Octicons
            name="discussion-duplicate"
            size={24}
            color={textColorOverride ?? (styles.cardFont as any).color}
          />
        </Pressable>
      ) : null}
    </View>
  );

  if (allowMultilinePrompt) {
    return (
      <View style={styles.cardContentLarge}>
        {promptBlock}
        <View
          style={[
            styles.inputContainerLarge,
            styles.inputContainerLargeCorrection,
          ]}
        >
          {showAwersInput ? input1Block : null}
          {showRewersInput ? input2Block : null}
        </View>
      </View>
    );
  }

  return (
    <>
      {promptBlock}
      {showAwersInput ? input1Block : null}
      {showRewersInput ? input2Block : null}
    </>
  );
}
