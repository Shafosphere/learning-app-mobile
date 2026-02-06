import React from "react";
import {
  Image,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useStyles } from "./LogoMessage-styles";

type LogoMessageVariant =
  | "start"
  | "pin"
  | "pinError"
  | "postPin"
  | "activate"
  | "done";

const LOGO_SOURCE = require("@/assets/illustrations/box/logo.png");

const DEFAULT_COPY: Record<
  LogoMessageVariant,
  { title: string; description: string }
> = {
  start: {
    title: "Witaj w aplikacji do fiszek",
    description: "Dodaj kurs kodem od prowadzącego i odblokuj materiały.",
  },
  pin: {
    title: "Dodaj kurs kodem",
    description: "Wpisz kod kursu, żeby przypiąć go do swojego profilu.",
  },
  pinError: {
    title: "Nie znaleziono kursu",
    description: "Sprawdź kod albo poproś prowadzącego o poprawny.",
  },
  postPin: {
    title: "Kurs dodany",
    description: "Aktywuj go, by pobrać materiały i śledzić postęp.",
  },
  activate: {
    title: "Aktywuj kurs",
    description: "Potwierdź, aby odblokować fiszki i zapisywać postępy.",
  },
  done: {
    title: "Gotowe!",
    description: "Kurs aktywny. Lecimy do fiszek.",
  },
};

export type LogoMessageProps = {
  variant?: LogoMessageVariant;
  title?: string;
  description?: string;
  style?: StyleProp<ViewStyle>;
  floating?: boolean;
  offset?: Partial<{
    top: number;
    bottom: number;
    left: number;
    right: number;
  }>;
  maxBodyHeight?: number;
  onLayout?: (event: LayoutChangeEvent) => void;
  onClose?: () => void;
  closeLabel?: string;
};

export default function LogoMessage({
  variant = "pin",
  title,
  description,
  style,
  floating = false,
  offset,
  maxBodyHeight,
  onLayout,
  onClose,
  closeLabel = "Zamknij",
}: LogoMessageProps) {
  const styles = useStyles();
  const copy = DEFAULT_COPY[variant];
  const resolvedTitle = title ?? copy?.title ?? "";
  const resolvedDescription = description ?? copy?.description ?? "";

  return (
    <View
      style={[
        styles.container,
        floating && styles.floating,
        floating && offset,
        style,
      ]}
      pointerEvents={floating ? "auto" : undefined}
      onLayout={onLayout}
      accessible
      accessibilityRole="text"
    >
      <Image source={LOGO_SOURCE} style={styles.logo} />
      {typeof maxBodyHeight === "number" ? (
        <ScrollView
          style={[styles.textWrapper, { maxHeight: maxBodyHeight }]}
          contentContainerStyle={styles.textContent}
          showsVerticalScrollIndicator={false}
        >
          {resolvedTitle ? (
            <Text style={styles.title}>{resolvedTitle}</Text>
          ) : null}
          {resolvedDescription ? (
            <Text style={styles.description}>{resolvedDescription}</Text>
          ) : null}
        </ScrollView>
      ) : (
        <View style={styles.textWrapper}>
          {resolvedTitle ? (
            <Text style={styles.title}>{resolvedTitle}</Text>
          ) : null}
          {resolvedDescription ? (
            <Text style={styles.description}>{resolvedDescription}</Text>
          ) : null}
        </View>
      )}
      {onClose ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          hitSlop={16}
          style={styles.closeButton}
          onPress={onClose}
        >
          <Text style={styles.closeLabel}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
