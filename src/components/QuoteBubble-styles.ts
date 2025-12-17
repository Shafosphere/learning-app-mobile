import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { StyleSheet } from "react-native";

export const useStyles = createThemeStylesHook((colors) => ({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.4)",
        zIndex: 1000,
        alignItems: "center",
    },
    container: {
        position: "absolute",
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 1001,
    },
    bubble: {
        backgroundColor: colors.my_yellow, // Default to yellow like boxik, or dynamic
        paddingVertical: 14,
        paddingHorizontal: 22,
        borderRadius: 5,
        maxWidth: 320,
        alignSelf: "center",
        // No explicit border or shadow to match clean popup style, or match popup text shadow if needed
    },
    text: {
        color: colors.headline,
        fontWeight: "600",
        fontSize: 15,
        textAlign: "center",
        marginBottom: 8,
    },
    author: {
        color: colors.headline, // Fixed: label -> headline or paragraph
        fontSize: 12,
        textAlign: "right",
        fontStyle: "italic",
    },
    tail: {
        width: 18,
        height: 18,
        borderRadius: 4,
        backgroundColor: colors.my_yellow, // Match bubble
        transform: [{ rotate: "45deg" }],
        marginBottom: -9,
        alignSelf: "center",
        // zIndex: 1002, // Not needed if structure is right
    },
}));
