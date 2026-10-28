import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useLandscapeStudyLayout } from "../landscapeStudyLayout";

/** Both columns remain reachable with long questions and enlarged text. */
export function LandscapeCardContent({ prompt, children }: { prompt: ReactNode; children: ReactNode }) {
  const layout = useLandscapeStudyLayout();
  if (!layout) return null;
  return (
    <View testID="landscape-study-card" style={[styles.row, { height: layout.height }]}>
      <ScrollView
        style={{ width: layout.promptWidth, flexGrow: 0 }}
        contentContainerStyle={styles.column}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {prompt}
      </ScrollView>
      <View style={styles.divider} />
      <ScrollView
        style={styles.answer}
        contentContainerStyle={styles.column}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "stretch", gap: 16, paddingVertical: 12 },
  column: { flexGrow: 1, justifyContent: "center", paddingVertical: 4 },
  answer: { flex: 1, minWidth: 0 },
  divider: { width: 1, backgroundColor: "#80808030" },
});
