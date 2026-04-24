import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 160,
  },
  boxContainer: {
    width: "75%",
    gap: 10,
    overflow: "hidden",
  },
  box: {
    width: 75,
    height: 75,
    backgroundColor: colors.secondBackground,
    borderWidth: 5,
    borderColor: colors.border,
    borderRadius: 13,
    zIndex: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  boxLeft: {
    alignSelf: "flex-start",
  },
  boxRight: {
    alignSelf: "flex-end",
  },

  connectorArea: {
    width: "100%",
    height: 80,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -28,
    marginBottom: -28,
    // backgroundColor: colors.my_green,
  },
  connectorStripe: {
    position: "absolute",
    width: "68%",
    zIndex: 0,
    top: 15,
  },
  connectorFromLeft: {
    left: 30,
    transform: [{ rotate: "25deg" }],
  },
  connectorFromRight: {
    right: 30,
    transform: [{ rotate: "-25deg" }, { scaleX: -1 }],
  },
  peekContent: {
    alignSelf: "stretch",
    gap: 14,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  peekHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  peekHeadingIcon: {
    fontSize: 18,
  },
  peekHeadingText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.4,
    color: colors.headline,
  },
  peekParagraph: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.paragraph,
  },
  peekList: {
    gap: 10,
  },
  peekListItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  peekBullet: {
    width: 8,
    height: 8,
    borderRadius: 6,
    marginTop: 8,
    backgroundColor: colors.paragraph,
  },
  peekListText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: colors.paragraph,
  },
  peekCallout: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  peekCalloutText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.headline,
  },
  peekExample: {
    borderWidth: 0,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: colors.secondBackground,
    gap: 10,
  },
  peekExampleLabel: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
    color: colors.headline,
    textTransform: "uppercase",
  },
}));
