import type { ReactNode } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";

export function ReadablePrompt({ text, onRead, children, style }: { text: string; onRead?: () => void; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { t } = useTranslation();
  if (!onRead) return <>{children}</>;
  return <Pressable onPress={onRead} accessibilityRole="button"
    accessibilityLabel={t("flashcards.card.readText", { text })}
    accessibilityHint={t("flashcards.card.readTextHint")}
    style={[{ flex: 1, minWidth: 0 }, style]}>
    {children}
  </Pressable>;
}
