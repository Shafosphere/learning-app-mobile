import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useBoxCarouselStyles = createThemeStylesHook((colors) => ({
    container: {
        // flex: 1,
        width: "100%",
        alignItems: "center",
        // backgroundColor: colors.my_red,
    },
    number: {
        fontSize: 40,
        textAlign: "center",
        paddingTop: 40,
        fontWeight: 800,
        color: colors.headline,
    },
    numberUpdate: {
        marginTop: 40,
    },
}));
