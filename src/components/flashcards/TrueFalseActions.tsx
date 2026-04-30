import MyButton from "@/src/components/button/button";
import {
  useSettings,
  type TrueFalseButtonsVariant,
} from "@/src/contexts/SettingsContext";
import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

type TrueFalseActionsProps = {
  onAnswer: (value: boolean) => void;
  onOk?: () => void;
  mode?: "answer" | "ok";
  okLabel?: string;
  disabled?: boolean;
  dense?: boolean;
  variant?: TrueFalseButtonsVariant;
  selectedAnswer?: boolean | null;
};

export function TrueFalseActions({
  onAnswer,
  onOk,
  mode = "answer",
  okLabel = "OK",
  disabled = false,
  dense = false,
  variant = "true_false",
  selectedAnswer = null,
}: TrueFalseActionsProps) {
  const { t } = useTranslation();
  const { colors } = useSettings();
  const styles = useMemo(() => makeStyles(colors, dense), [colors, dense]);
  const labels =
    variant === "know_dont_know"
      ? {
          falseLabel: t("components.flashcards.trueFalseActions.label.nieUmiem"),
          trueLabel: t("components.flashcards.trueFalseActions.label.umiem"),
        }
      : {
          falseLabel: t("components.flashcards.trueFalseActions.label.falsz"),
          trueLabel: t("components.flashcards.trueFalseActions.label.prawda"),
        };
  const getMarkLabel = (value: string) =>
    t(
      "components.flashcards.trueFalseActions.accessibilityLabel.oznaczJakoValue",
      {
        value,
      }
    );

  if (mode === "ok") {
    return (
      <View
        style={[styles.container, disabled && styles.disabled]}
        collapsable={false}
      >
        <MyButton
          text={labels.falseLabel}
          color="my_red"
          onPress={() => undefined}
          width={140}
          disabled
          accessibilityLabel={getMarkLabel(labels.falseLabel)}
        />
        <View style={styles.spacer} />
        <MyButton
          text={okLabel}
          color="my_yellow"
          onPress={onOk}
          width={140}
          disabled={disabled}
          accessibilityLabel={t(
            "components.flashcards.trueFalseActions.accessibilityLabel.potwierdzIPrzejdzDalej"
          )}
        />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, disabled && styles.disabled]}
      collapsable={false}
    >
      <MyButton
        text={labels.falseLabel}
        color="my_red"
        onPress={() => onAnswer(false)}
        width={140}
        disabled={disabled}
        accessibilityLabel={getMarkLabel(labels.falseLabel)}
      />
      <View style={styles.spacer} />
      <MyButton
        text={labels.trueLabel}
        color="my_green"
        onPress={() => onAnswer(true)}
        width={140}
        disabled={disabled}
        accessibilityLabel={getMarkLabel(labels.trueLabel)}
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
  selectedAnswer?: boolean | null;
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
  selectedAnswer = null,
}: TrueFalseActionsAnimatedProps) {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(visible ? 0 : 8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          speed: 20,
          bounciness: 6,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(translateY, {
          toValue: 8,
          duration: 150,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [opacity, translateY, visible]);

  return (
    <Animated.View
      style={{ opacity, transform: [{ translateY }], alignSelf: "center" }}
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
        selectedAnswer={selectedAnswer}
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
