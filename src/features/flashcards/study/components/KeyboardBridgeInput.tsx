import { forwardRef } from "react";
import { TextInput } from "react-native";
import type { TextInputProps } from "react-native";
import { useStyles } from "../study.styles";

type KeyboardBridgeInputProps = Pick<TextInputProps, "onFocus" | "onBlur">;

export const KeyboardBridgeInput = forwardRef<TextInput, KeyboardBridgeInputProps>(
  function KeyboardBridgeInput({ onFocus, onBlur }, ref) {
    const styles = useStyles();
    return (
      <TextInput
        ref={ref}
        style={styles.keyboardBridgeInput}
        value=""
        caretHidden
        autoCorrect={false}
        spellCheck={false}
        autoCapitalize="none"
        importantForAutofill="no"
        textContentType="none"
        onFocus={onFocus}
        onBlur={onBlur}
      />
    );
  },
);
