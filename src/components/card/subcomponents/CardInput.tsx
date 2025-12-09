import Octicons from "@expo/vector-icons/Octicons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import TextTicker from "react-native-text-ticker";
import { useStyles } from "../card-styles";

const MARQUEE_DELAY_MS = 800;
const MARQUEE_SPEED_PER_PIXEL_MS = 20;
const MIN_DURATION_MS = 4000;
const REPEAT_SPACER_PX = 14;
const AVG_CHAR_WIDTH_FACTOR = 0.65;

type CardInputProps = {
  promptText: string;
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
};

export function CardInput({
  promptText,
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
}: CardInputProps) {
  const styles = useStyles();
  const shouldMarqueePrompt = promptText.length > 18;
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

  return (
    <>
      <View style={styles.topContainer}>
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
            style={[styles.cardFont, styles.promptText]}
            numberOfLines={1}
            ellipsizeMode="tail"
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
        ) : (
          null
        )}
      </View>

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
    </>
  );
}
