import MyButton from "@/src/components/button/button";
import { useSettings, type TrueFalseButtonsVariant } from "@/src/contexts/SettingsContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

type TrueFalseActionsProps = {
  onAnswer: (value: boolean) => void;
  onOk?: () => void;
  mode?: "answer" | "ok";
  okLabel?: string;
  disabled?: boolean;
  dense?: boolean;
  variant?: TrueFalseButtonsVariant;
};

export function TrueFalseActions({
  onAnswer,
  onOk,
  mode = "answer",
  okLabel = "OK",
  disabled = false,
  dense = false,
  variant = "true_false",
}: TrueFalseActionsProps) {
  const { colors } = useSettings();
  const styles = useMemo(() => makeStyles(colors, dense), [colors, dense]);
  const labels =
    variant === "know_dont_know"
      ? { falseLabel: "NIE UMIEM", trueLabel: "UMIEM" }
      : { falseLabel: "FAŁSZ", trueLabel: "PRAWDA" };

  if (mode === "ok") {
    if (variant === "know_dont_know") {
      return (
        <View style={[styles.container, disabled && styles.disabled]}>
          <MyButton
            text={labels.falseLabel}
            color="my_red"
            onPress={() => undefined}
            width={140}
            disabled
            accessibilityLabel={`Oznacz jako ${labels.falseLabel}`}
          />
          <View style={styles.spacer} />
          <MyButton
            text={okLabel}
            color="my_yellow"
            onPress={onOk}
            width={140}
            disabled={disabled}
            accessibilityLabel="Potwierdź i przejdź dalej"
          />
        </View>
      );
    }
    return (
      <View style={[styles.container, disabled && styles.disabled]}>
        <MyButton
          text={okLabel}
          color="my_yellow"
          onPress={onOk}
          width={140}
          disabled={disabled}
          accessibilityLabel="Potwierdź i przejdź dalej"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      <MyButton
        text={labels.falseLabel}
        color="my_red"
        onPress={() => onAnswer(false)}
        width={140}
        disabled={disabled}
        accessibilityLabel={`Oznacz jako ${labels.falseLabel}`}
      />
      <View style={styles.spacer} />
      <MyButton
        text={labels.trueLabel}
        color="my_green"
        onPress={() => onAnswer(true)}
        width={140}
        disabled={disabled}
        accessibilityLabel={`Oznacz jako ${labels.trueLabel}`}
      />
    </View>
  );
}

type TrueFalseActionsAnimatedProps = {
  visible: boolean;
  onAnswer: (value: boolean) => void;
  onOk?: () => void;
  mode?: "answer" | "ok";
  okLabel?: string;
  disabled?: boolean;
  dense?: boolean;
  variant?: TrueFalseButtonsVariant;
};

export function TrueFalseActionsAnimated({
  visible,
  onAnswer,
  onOk,
  mode = "answer",
  okLabel = "OK",
  disabled = false,
  dense = false,
  variant = "true_false",
}: TrueFalseActionsAnimatedProps) {
  const [rendered, setRendered] = useState(visible);
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(visible ? 0 : 8)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          speed: 20,
          bounciness: 6,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setRendered(false);
        }
      });
    }
  }, [opacity, translateY, visible]);

  if (!rendered) return null;

  return (
    <Animated.View
      style={{ opacity, transform: [{ translateY }], width: "100%" }}
      pointerEvents={visible && !disabled ? "auto" : "none"}
    >
      <TrueFalseActions
        onAnswer={onAnswer}
        onOk={onOk}
        mode={mode}
        okLabel={okLabel}
        disabled={disabled}
        dense={dense}
        variant={variant}
      />
    </Animated.View>
  );
}

const makeStyles = (colors: any, dense: boolean) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: dense ? 0 : 16,
      paddingTop: dense ? 0 : 12,
      paddingBottom: dense ? 0 : 4,
      backgroundColor: dense ? "transparent" : colors?.bg ?? "transparent",
    },
    disabled: {
      opacity: 0.55,
    },
    spacer: {
      width: 20,
    },
  });
