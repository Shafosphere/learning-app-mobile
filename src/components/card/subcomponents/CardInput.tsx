import Octicons from "@expo/vector-icons/Octicons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import TextTicker from "react-native-text-ticker";
import { useStyles } from "../card-styles";
import { PromptImage } from "./PromptImage";

const MARQUEE_DELAY_MS = 800;
const MARQUEE_SPEED_PER_PIXEL_MS = 20;
const MIN_DURATION_MS = 4000;
const REPEAT_SPACER_PX = 14;
const AVG_CHAR_WIDTH_FACTOR = 0.65;

type CardInputProps = {
  promptText: string;
  allowMultilinePrompt: boolean;
  onPromptLayout?: (height: number) => void;
  onInputLayout?: (height: number) => void;
  promptImageUri?: string | null;
  answer: string;
  setAnswer: (text: string) => void;
  mainInputRef: React.RefObject<TextInput | null>;
  suggestionProps: any;
  handleConfirm: () => void;
  shouldUseHangulKeyboardMain: boolean;
  setIsMainInputFocused: (focused: boolean) => void;
  setHangulTarget: (target: "main" | "correction1" | null) => void;
  canToggleTranslations: boolean;
  next: () => void;
  hangulTarget: "main" | "correction1" | null;
  typoDiff?: {
    type: "substitution" | "insertion" | "deletion";
    index: number;
    expectedChar: string;
    inputChar: string;
  } | null;
};

export function CardInput({
  promptText,
  allowMultilinePrompt,
  onPromptLayout,
  onInputLayout,
  promptImageUri,
  answer,
  setAnswer,
  mainInputRef,
  suggestionProps,
  handleConfirm,
  shouldUseHangulKeyboardMain,
  setIsMainInputFocused,
  setHangulTarget,
  canToggleTranslations,
  next,
  hangulTarget,
  typoDiff,
}: CardInputProps) {
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

  const renderedInput = useMemo(() => {
    if (!typoDiff) {
      return (
        <TextInput
          style={[styles.cardInput, styles.cardFont]}
          value={answer}
          onChangeText={setAnswer}
          autoCapitalize="none"
          {...suggestionProps}
          ref={mainInputRef}
          returnKeyType="done"
          blurOnSubmit={false}
          onSubmitEditing={handleConfirm}
          showSoftInputOnFocus={!shouldUseHangulKeyboardMain}
          onFocus={() => {
            setIsMainInputFocused(true);
            setHangulTarget("main");
          }}
          onBlur={() => {
            setIsMainInputFocused(false);
            if (hangulTarget === "main") {
              setHangulTarget(null);
            }
          }}
        />
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
        <Text style={styles.cardFont}>
          {beforeCursor}
          {errorPart}
          {correctionPart}
          {afterCursor}
        </Text>
      </View>
    );
  }, [
    answer,
    suggestionProps,
    handleConfirm,
    hangulTarget,
    handleConfirm,
    mainInputRef,
    setAnswer,
    setIsMainInputFocused,
    setHangulTarget,
    shouldUseHangulKeyboardMain,
    styles,
    typoDiff
  ]);

  const imageBlock = promptImageUri ? (
    <PromptImage
      key={promptImageUri}
      uri={promptImageUri}
      imageStyle={styles.promptImage}
      onHeightChange={(height) => {
        if (allowMultilinePrompt && onPromptLayout) {
          onPromptLayout(height);
        }
      }}
    />
  ) : null;

  const content = (
    <>
      <View
        style={[
          styles.topContainer,
          allowMultilinePrompt && styles.topContainerLarge,
          // If we show image, we want to center it, similar to how text is centered or styled
          promptImageUri && allowMultilinePrompt && { justifyContent: 'center' }
        ]}
      >
        {promptImageUri ? (
          imageBlock
        ) : (
          <View style={styles.promptRow}>
            {shouldMarqueePrompt ? (
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
                onLayout={({ nativeEvent }) => {
                  if (allowMultilinePrompt && onPromptLayout) {
                    onPromptLayout(nativeEvent.layout.height);
                  }
                }}
              >
                {promptText}
              </Text>
            )}
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

      {allowMultilinePrompt ? (
        <View
          style={styles.inputContainerLarge}
          onLayout={({ nativeEvent }) => {
            if (onInputLayout) {
              onInputLayout(nativeEvent.layout.height);
            }
          }}
        >
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
