import MyButton from "@/src/components/button/button";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

type TrueFalseActionsProps = {
  onAnswer: (value: boolean) => void;
  disabled?: boolean;
  dense?: boolean;
};

export function TrueFalseActions({
  onAnswer,
  disabled = false,
  dense = false,
}: TrueFalseActionsProps) {
  const { colors } = useSettings();
  const styles = useMemo(() => makeStyles(colors, dense), [colors, dense]);

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      <MyButton
        text="FAŁSZ"
        color="my_red"
        onPress={() => onAnswer(false)}
        width={140}
        disabled={disabled}
        accessibilityLabel="Oznacz jako Fałsz"
      />
      <View style={styles.spacer} />
      <MyButton
        text="PRAWDA"
        color="my_green"
        onPress={() => onAnswer(true)}
        width={140}
        disabled={disabled}
        accessibilityLabel="Oznacz jako Prawda"
      />
    </View>
  );
}

type TrueFalseActionsAnimatedProps = {
  visible: boolean;
  onAnswer: (value: boolean) => void;
  disabled?: boolean;
  dense?: boolean;
};

export function TrueFalseActionsAnimated({
  visible,
  onAnswer,
  disabled = false,
  dense = false,
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
      <TrueFalseActions onAnswer={onAnswer} disabled={disabled} dense={dense} />
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
