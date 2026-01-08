import Octicons from "@expo/vector-icons/Octicons";
import { Image } from "expo-image";
import { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import TextTicker from "react-native-text-ticker";
import { useStyles } from "../card-styles";

const MARQUEE_DELAY_MS = 800;
const MARQUEE_SPEED_PER_PIXEL_MS = 20;
const MIN_DURATION_MS = 4000;
const REPEAT_SPACER_PX = 14;
const AVG_CHAR_WIDTH_FACTOR = 0.65;

type CardCorrectionProps = {
  correction: {
    awers: string;
    rewers: string;
    input1: string;
    input2: string;
  };
  promptText: string;
  promptImageUri?: string | null;
  correctionAwers: string;
  correctionRewers: string;
  answerOnly: boolean;
  allowMultilinePrompt: boolean;
  onPromptLayout?: (height: number) => void;
  onInputLayout?: (height: number) => void;
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
  focusWithDelay: (
    ref: React.RefObject<TextInput | null>,
    delay?: number
  ) => void;
  setIsCorrectionInput1Focused: (focused: boolean) => void;
  setHangulTarget: (target: "main" | "correction1" | null) => void;
  shouldUseHangulKeyboardCorrection1: boolean;
  previousCorrectionInput2: React.MutableRefObject<string>;
  canToggleTranslations: boolean;
  next: () => void;
  input1LayoutWidth: number;
  input2LayoutWidth: number;
};

export function CardCorrection({
  correction,
  promptText,
  promptImageUri,
  correctionAwers,
  correctionRewers,
  answerOnly,
  allowMultilinePrompt,
  onPromptLayout,
  onInputLayout,
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
  focusWithDelay,
  setIsCorrectionInput1Focused,
  setHangulTarget,
  shouldUseHangulKeyboardCorrection1,
  previousCorrectionInput2,
  canToggleTranslations,
  next,
  input1LayoutWidth,
  input2LayoutWidth,
}: CardCorrectionProps) {
  const styles = useStyles();
  const shouldMarqueePrompt = !allowMultilinePrompt && promptText.length > 18;
  const promptTextStyle = useMemo(
    () => [styles.cardFont, styles.promptMarqueeText],
    [styles]
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

  const promptContent = shouldMarqueePrompt ? (
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
      ]}
      numberOfLines={allowMultilinePrompt ? undefined : 1}
      ellipsizeMode={allowMultilinePrompt ? "clip" : "tail"}
    >
      {promptText}
    </Text>
  );

  const promptImage = promptImageUri ? (
    <View
      style={styles.promptImageWrapper}
      onLayout={({ nativeEvent }) => {
        if (allowMultilinePrompt && onPromptLayout) {
          onPromptLayout(nativeEvent.layout.height);
        }
      }}
    >
      <Image
        source={{ uri: promptImageUri }}
        style={styles.promptImage}
        contentFit="contain"
      />
    </View>
  ) : null;

  const promptBlock = (
    <View
      style={[
        styles.topContainer,
        allowMultilinePrompt && styles.topContainerLarge,
        // Center image if present
        promptImageUri && allowMultilinePrompt && { justifyContent: 'center' }
      ]}
    >
      {promptImageUri ? (
        promptImage
      ) : (
        <View style={styles.promptRow}>
          {promptContent}
          {canToggleTranslations ? (
            <Pressable style={styles.cardIconWrapper} onPress={next} hitSlop={8}>
              <Octicons
                name="discussion-duplicate"
                size={24}
                color={styles.cardFont.color}
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
        allowMultilinePrompt ? styles.containerInputLarge : styles.containerInput,
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
          <Text style={styles.myplaceholder} numberOfLines={1} ellipsizeMode="clip">
            {correctionAwers}
          </Text>
          <TextInput
            value={correction.input1}
            onChangeText={(text) =>
              handleCorrectionInput1Change(
                applyPlaceholderCasing(text, correctionAwers)
              )
            }
            style={styles.myinput}
            ref={input1Ref}
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => focusWithDelay(input2Ref)}
            autoCapitalize="none"
            {...suggestionProps}
            showSoftInputOnFocus={!shouldUseHangulKeyboardCorrection1}
            onFocus={() => {
              setIsCorrectionInput1Focused(true);
              setHangulTarget("correction1");
            }}
            onBlur={() => {
              setIsCorrectionInput1Focused(false);
              setHangulTarget(null);
            }}
          />
          {isIntroMode ? (
            <Text style={styles.inputOverlay} numberOfLines={1} ellipsizeMode="clip">
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
        allowMultilinePrompt ? styles.containerInputLarge : styles.containerInput,
        answerOnly && !allowMultilinePrompt && styles.containerInputFirst,
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
          <Text style={styles.myplaceholder} numberOfLines={1} ellipsizeMode="clip">
            {correctionRewers}
          </Text>
          <TextInput
            value={correction.input2}
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
                focusWithDelay(input1Ref);
              }
            }}
            style={styles.myinput}
            ref={input2Ref}
            returnKeyType="done"
            autoCapitalize="none"
            {...suggestionProps}
            onKeyPress={({ nativeEvent }) => {
              if (
                !answerOnly &&
                nativeEvent.key === "Backspace" &&
                correction.input2.length <= 1
              ) {
                focusWithDelay(input1Ref);
              }
            }}
          />
          {isIntroMode ? (
            <Text style={styles.inputOverlay} numberOfLines={1} ellipsizeMode="clip">
              {renderOverlayText(correction.input2, correctionRewers)}
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
            color={styles.cardFont.color}
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
          onLayout={({ nativeEvent }) => {
            if (onInputLayout) {
              onInputLayout(nativeEvent.layout.height);
            }
          }}
        >
          {answerOnly ? input2Block : input1Block}
          {!answerOnly ? input2Block : null}
        </View>
      </View>
    );
  }

  return (
    <>
      {promptBlock}
      {answerOnly ? input2Block : input1Block}
      {!answerOnly ? input2Block : null}
    </>
  );
}
