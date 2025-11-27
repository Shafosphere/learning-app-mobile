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
    },
    boxWords: {
        color: colors.headline,
        fontWeight: 900,
        textAlign: "center",
        fontSize: 20,
        margin: 4,
    },
}));
