import { StyleSheet, Text, View } from "react-native";

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
  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
    </View>
  );
}
