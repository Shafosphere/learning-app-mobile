import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { Platform } from "react-native";

export const useStyles = createThemeStylesHook(() => ({
  container: {
    flex: 1,
    backgroundColor: "#f3f6f8",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  card: {
    width: "100%",
    maxWidth: 340,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 35,
    letterSpacing: 0.2,
    color: "#0b2d4a",
    marginBottom: 18,
  },
  flagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 18,
    rowGap: 18,
    width: 312,
    marginTop: 18,
  },
  flagButton: {
    width: 92,
    height: 62,
    borderRadius: 14,
    borderWidth: 5,
    borderColor: "transparent",
    overflow: "hidden",
    backgroundColor: "transparent",
    // shadowColor: "#000000",
    // shadowOpacity: 0.08,
    // shadowRadius: 6,
    // shadowOffset: { width: 0, height: 3 },
    // elevation: 2,
  },
  flagButtonActive: {
    borderColor: "rgba(8,225,195,0.90)",
    shadowColor: "#08e1c3",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  flagButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  flagImage: {
    width: "100%",
    height: "100%",
  },
  confirmWrap: {
    marginTop: 40,
    alignSelf: "flex-end",
  },
  confirmButton: {
    minWidth: 154,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#08e1c3",
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  confirmButtonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: "#06cbb1",
  },
  confirmButtonDisabled: {
    opacity: 0.65,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
      default: {},
    }),
  },
  confirmLabel: {
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "#053233",
  },
  hint: {
    marginTop: 10,
    color: "#6b7a88",
    fontSize: 13,
    textAlign: "right",
  },
}));
