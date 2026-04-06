import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useBoxCarouselStyles = createThemeStylesHook((colors) => ({
    container: {
        width: "100%",
        alignItems: "center",
    },
    listContainer: {
        width: "100%",
    },
    itemContainer: {
        alignItems: "center",
        justifyContent: "flex-start",
    },
    boxStage: {
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    counterStage: {
        width: "100%",
        alignItems: "center",
        justifyContent: "flex-start",
    },
    activeCounterWrap: {
        minHeight: 48,
        marginTop: -18,
        alignItems: "center",
        justifyContent: "flex-start",
    },
    number: {
        fontSize: 40,
        lineHeight: 44,
        textAlign: "center",
        fontWeight: 800,
        color: colors.headline,
    },
    numberUpdate: {
        marginTop: 0,
    },
}));
