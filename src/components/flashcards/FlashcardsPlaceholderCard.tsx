import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { getResponsiveFlashcardMetrics } from "@/src/components/card/responsiveCardWidth";

type FlashcardsPlaceholderCardProps = {
  title: string;
  description?: string | null;
};

const styles = StyleSheet.create({
  card: {
    width: 325,
    minHeight: 120,
    alignSelf: "center",
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    gap: 8,
  },
  content: {
    gap: 6,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
  },
});

export function FlashcardsPlaceholderCard({
  title,
  description,
}: FlashcardsPlaceholderCardProps) {
  const { width: windowWidth } = useWindowDimensions();
  const cardMetrics = getResponsiveFlashcardMetrics(windowWidth);

  return (
    <View
      testID="flashcards-placeholder-card"
      style={[
        styles.card,
        {
          width: cardMetrics.width,
          minHeight: cardMetrics.minHeight,
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
    </View>
  );
}
