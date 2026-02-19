import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useBoxCarouselStyles = createThemeStylesHook((colors) => ({
    container: {
        width: "100%",
        alignItems: "center",
        // Reserve extra room for the animated counter under the active box.
        paddingBottom: 56,
    },
    number: {
        fontSize: 40,
        textAlign: "center",
        paddingTop: 10,
        fontWeight: 800,
        color: colors.headline,
    },
    numberUpdate: {
        marginTop: 10,
    },
}));
