import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    alignItems: "flex-end",
  },
  text: {
    textAlign: "left",
    width: "100%",
    fontSize: 24,
    fontWeight: "bold",
  },
  buttons: {
    marginTop: 24,
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
});
