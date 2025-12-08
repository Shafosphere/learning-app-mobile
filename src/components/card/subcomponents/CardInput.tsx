import Octicons from "@expo/vector-icons/Octicons";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useStyles } from "../card-styles";

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

  return (
    <>
      <View style={styles.topContainer}>
        {shouldMarqueePrompt ? (
          <ScrollView
            style={styles.promptScroll}
            contentContainerStyle={styles.promptScrollContent}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <Text
              style={[styles.cardFont, styles.promptText, styles.promptScrollText]}
              numberOfLines={1}
            >
              {promptText}
            </Text>
          </ScrollView>
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
          <View style={styles.cardIconPlaceholder} />
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
