import { ThemeColors } from "@/src/theme/theme";
import { StyleSheet } from "react-native";

export const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            padding: 16,
        },
        header: {
            fontSize: 28,
            fontWeight: "bold",
            color: colors.headline,
            marginBottom: 20,
            textAlign: "center",
            marginTop: 20,
        },
        scrollContent: {
            paddingBottom: 20,
        },
        section: {
            marginBottom: 24,
            backgroundColor: colors.secondBackground,
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
        },
        sectionTitle: {
            fontSize: 20,
            fontWeight: "bold",
            color: colors.headline,
            marginBottom: 12,
        },
        text: {
            fontSize: 16,
            color: colors.paragraph,
            lineHeight: 24,
            marginBottom: 8,
        },
        legendItem: {
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
        },
        legendIconContainer: {
            width: 40,
            alignItems: "center",
            marginRight: 12,
        },
        legendText: {
            fontSize: 16,
            color: colors.paragraph,
            flex: 1,
        },
        bottomBar: {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 16,
        },
        tabsContainer: {
            flexDirection: "row",
            gap: 12,
        },
        tabButton: {
            padding: 10,
            borderRadius: 8,
            backgroundColor: colors.secondBackground,
            borderWidth: 1,
            borderColor: colors.border,
        },
        activeTabButton: {
            backgroundColor: colors.my_green,
            borderColor: colors.my_green,
        }
    });
