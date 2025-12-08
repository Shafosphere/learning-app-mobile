import Octicons from "@expo/vector-icons/Octicons";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useStyles } from "../card-styles";

type CardCorrectionProps = {
  correction: {
    awers: string;
    rewers: string;
    input1: string;
    input2: string;
  };
  correctionAwers: string;
  correctionRewers: string;
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
  correctionAwers,
  correctionRewers,
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

  return (
    <>
      <View
        style={styles.containerInput}
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
              style={styles.myplaceholder}
              numberOfLines={1}
              ellipsizeMode="clip"
            >
              {correctionAwers}
            </Text>
            <TextInput
              value={correction.input1}
              onChangeText={handleCorrectionInput1Change}
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
      <View
        style={styles.containerInput}
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
              style={styles.myplaceholder}
              numberOfLines={1}
              ellipsizeMode="clip"
            >
              {correctionRewers}
            </Text>
            <TextInput
              value={correction.input2}
              onChangeText={(t) => {
                const previousValue = previousCorrectionInput2.current;
                const shouldFocusPrevious =
                  Platform.OS === "android" &&
                  previousValue.length === 1 &&
                  t === "";
                previousCorrectionInput2.current = t;
                wrongInputChange(2, t);
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
                  nativeEvent.key === "Backspace" &&
                  correction.input2.length <= 1
                ) {
                  focusWithDelay(input1Ref);
                }
              }}
            />
            {isIntroMode ? (
              <Text
                style={styles.inputOverlay}
                numberOfLines={1}
                ellipsizeMode="clip"
              >
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
    </>
  );
}
