import MyButton from "@/src/components/button/button";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CardMathText, hasMathSegments } from "./CardMathText";

type CardTrueFalseProps = {
    promptText: string;
    promptImageUri: string | null;
    onAnswer: (value: boolean) => void;
    allowMultilinePrompt?: boolean;
    showButtons?: boolean;
    onPromptLayout?: (height: number) => void;
    onInputLayout?: (height: number) => void;
};

const DEFAULT_VIRTUAL_INPUT_HEIGHT = 24;

export function CardTrueFalse({
    promptText,
    promptImageUri: _promptImageUri,
    onAnswer,
    allowMultilinePrompt,
    showButtons = true,
    onPromptLayout,
    onInputLayout,
}: CardTrueFalseProps) {
    const { colors } = useSettings();
    const styles = useMemo(() => makeStyles(colors), [colors]);

    const hasMath = useMemo(() => hasMathSegments(promptText), [promptText]);

    useEffect(() => {
        if (!showButtons) {
            // Reserve a small vertical buffer so long prompts don't get clipped.
            onInputLayout?.(DEFAULT_VIRTUAL_INPUT_HEIGHT);
        }
    }, [onInputLayout, showButtons]);

    return (
        <View style={styles.container}>
            <View style={styles.promptContainer}>
                {allowMultilinePrompt ? (
                    hasMath ? (
                        <CardMathText
                            text={promptText}
                            textStyle={styles.promptTextMulti}
                            onLayout={(event) => {
                                if (allowMultilinePrompt) {
                                    onPromptLayout?.(event.nativeEvent.layout.height);
                                }
                            }}
                        />
                    ) : (
                        <Text
                            style={styles.promptTextMulti}
                            onLayout={(event) => {
                                if (allowMultilinePrompt) {
                                    onPromptLayout?.(event.nativeEvent.layout.height);
                                }
                            }}
                        >
                            {promptText}
                        </Text>
                    )
                ) : hasMath ? (
                    <CardMathText
                        text={promptText}
                        textStyle={styles.promptText}
                        onLayout={(event) => {
                            if (allowMultilinePrompt) {
                                onPromptLayout?.(event.nativeEvent.layout.height);
                            }
                        }}
                    />
                ) : (
                    <Text
                        style={styles.promptText}
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        onLayout={(event) => {
                            if (allowMultilinePrompt) {
                                onPromptLayout?.(event.nativeEvent.layout.height);
                            }
                        }}
                    >
                        {promptText}
                    </Text>
                )}
            </View>

            {showButtons ? (
                <View
                    style={styles.buttonsRow}
                    onLayout={(event) => {
                        onInputLayout?.(event.nativeEvent.layout.height);
                    }}
                >
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
            color: colors.headline,
            textAlign: "center",
        },
        promptTextMulti: {
            fontSize: 22,
            fontWeight: "bold",
            color: colors.headline,
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
