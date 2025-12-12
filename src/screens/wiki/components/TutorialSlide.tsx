import { useSettings } from "@/src/contexts/SettingsContext";
import { ThemeColors } from "@/src/theme/theme";
import React, { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

interface TutorialSlideProps {
    title: string;
    description: string;
    children?: ReactNode; // For the "Visual" part (icons, images, mock cards)
}

export default function TutorialSlide({ title, description, children }: TutorialSlideProps) {
    const { colors } = useSettings();
    const styles = createStyles(colors);

    return (
        <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>

            <View style={styles.visualContainer}>
                {children}
            </View>

            <Text style={styles.description}>{description}</Text>
        </View>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        card: {
            width: "100%",
            backgroundColor: colors.secondBackground, // Slightly different card bg
            borderRadius: 16,
            padding: 20,
            alignItems: "center",
            minHeight: 300,
            borderWidth: 1,
            borderColor: colors.border,
        },
        title: {
            fontSize: 22,
            fontWeight: "bold",
            color: colors.headline,
            marginBottom: 16,
            textAlign: "center",
        },
        visualContainer: {
            flex: 1,
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 16,
            minHeight: 120,
        },
        description: {
            fontSize: 16,
            color: colors.paragraph,
            textAlign: "center",
            lineHeight: 24,
        },
    });
