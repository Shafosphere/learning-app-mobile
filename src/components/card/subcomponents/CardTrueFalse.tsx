import MyButton from "@/src/components/button/button";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

type CardTrueFalseProps = {
    promptText: string;
    promptImageUri: string | null;
    onAnswer: (value: boolean) => void;
    allowMultilinePrompt?: boolean;
    showButtons?: boolean;
};

export function CardTrueFalse({
    promptText,
    promptImageUri,
    onAnswer,
    allowMultilinePrompt,
    showButtons = true,
}: CardTrueFalseProps) {
    const { colors } = useSettings();
    const styles = useMemo(() => makeStyles(colors), [colors]);

    return (
        <View style={styles.container}>
            <View style={styles.promptContainer}>
                {allowMultilinePrompt ? (
                    <Text style={styles.promptTextMulti}>{promptText}</Text>
                ) : (
                    <Text style={styles.promptText} numberOfLines={2} adjustsFontSizeToFit>
                        {promptText}
                    </Text>
                )}
            </View>

            {showButtons ? (
                <View style={styles.buttonsRow}>
                    <MyButton
                        text="FAŁSZ"
                        color="my_red"
                        onPress={() => onAnswer(false)}
                        width={140}
                        accessibilityLabel="Oznacz jako Fałsz"
                    />
                    <View style={styles.spacer} />
                    <MyButton
                        text="PRAWDA"
                        color="my_green"
                        onPress={() => onAnswer(true)}
                        width={140}
                        accessibilityLabel="Oznacz jako Prawda"
                    />
                </View>
            ) : null}
        </View>
    );
}

const makeStyles = (colors: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 10,
        },
        promptContainer: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 16,
            width: "100%",
        },
        promptText: {
            fontSize: 24,
            fontWeight: "bold",
            color: colors.my_blue || "#000",
            textAlign: "center",
        },
        promptTextMulti: {
            fontSize: 22,
            fontWeight: "bold",
            color: colors.my_blue || "#000",
            textAlign: "center",
        },
        buttonsRow: {
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            marginTop: 20,
            marginBottom: 10,
        },
        spacer: {
            width: 20,
        },
    });
