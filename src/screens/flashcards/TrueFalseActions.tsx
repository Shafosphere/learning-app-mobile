import MyButton from "@/src/components/button/button";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

type TrueFalseActionsProps = {
  onAnswer: (value: boolean) => void;
};

export function TrueFalseActions({ onAnswer }: TrueFalseActionsProps) {
  const { colors } = useSettings();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <MyButton
        text="FAŁSZ"
        color="my_red"
        onPress={() => onAnswer(false)}
        width={140}
        accessibilityLabel="Oznacz jako Fałsz"
      />
      <View style={styles.spacer} />
      <MyButton
        text="PRAWDA"
        color="my_green"
        onPress={() => onAnswer(true)}
        width={140}
        accessibilityLabel="Oznacz jako Prawda"
      />
    </View>
  );
}

type TrueFalseActionsAnimatedProps = {
  visible: boolean;
  onAnswer: (value: boolean) => void;
};

export function TrueFalseActionsAnimated({
  visible,
  onAnswer,
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
      pointerEvents={visible ? "auto" : "none"}
    >
      <TrueFalseActions onAnswer={onAnswer} />
    </Animated.View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
      backgroundColor: colors?.bg ?? "transparent",
    },
    spacer: {
      width: 20,
    },
  });
