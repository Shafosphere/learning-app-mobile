import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export const useBoxSkinStyles = createThemeStylesHook((colors) => ({
    containerSkin: {
        // marginTop: 20,
        position: "relative",
        width: 115,
        height: 122,
        paddingBottom: 2,
        borderBottomWidth: 5,
        borderBottomColor: "transparent",
    },
    caroPosition: {
        marginTop: 12,
    },
    skin: {
        position: "absolute",
        width: "100%",
        height: "100%",
    },
    activeBox: {
        borderBottomWidth: 5,
        borderBottomColor: colors.my_green,
    },
    cardsRow: {
        position: "absolute",
        width: "100%",
        height: "100%",
    },
    face: {
        position: "absolute",
        width: 56,
        height: 52,
        bottom: 5,
        right: 12,
        zIndex: 1000,
    },
    card1: {
        position: "absolute",
        height: 120,
        width: 100,
        right: 10,
    },
    card2: {
        position: "absolute",
        height: 120,
        width: 110,
        right: 10,
    },
    card3: {
        position: "absolute",
        height: 120,
        width: 100,
        right: 10,
    },
}));
