import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useBoxListStyles = createThemeStylesHook((colors) => ({
    container: {
        // flex: 1,
        width: "100%",
        alignItems: "center",
        // backgroundColor: colors.my_red,
    },
    containerTop: {
        width: "100%",
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        position: "relative",
    },
    containerTopHorizontal: {
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        justifyContent: "flex-start",
        position: "relative",
    },
    horizontalScrollViewport: {
        width: "100%",
    },
    horizontalScrollContent: {
        minWidth: "100%",
        flexDirection: "row",
        position: "relative",
    },
    horizontalBoxItem: {
        width: 164,
        minHeight: 210,
        alignItems: "center",
        justifyContent: "flex-start",
    },
    horizontalDebugHeader: {
        minHeight: 210,
    },
    horizontalDebugFooter: {
        minHeight: 210,
    },
    boxWords: {
        color: colors.headline,
        fontWeight: 900,
        textAlign: "center",
        fontSize: 20,
        margin: 4,
    },
    hiddenPromotionAnchor: {
        position: "absolute",
    },
    hiddenCountsAnchor: {
        position: "absolute",
    },
}));
