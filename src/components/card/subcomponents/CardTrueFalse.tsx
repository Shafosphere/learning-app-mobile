import MyButton from "@/src/components/button/button";
import { useSettings, type FlashcardsImageSize } from "@/src/contexts/SettingsContext";
import { useMemo } from "react";
import { StyleSheet, Text, View, type ImageStyle } from "react-native";
import { CardMathText, hasMathSegments } from "./CardMathText";
import { PromptImage } from "./PromptImage";
import { PROMPT_IMAGE_MAX_HEIGHT } from "../card-styles";

type CardTrueFalseProps = {
    promptText: string;
    promptImageUri: string | null;
    onAnswer: (value: boolean) => void;
    allowMultilinePrompt?: boolean;
    showButtons?: boolean;
    imageSizeMode?: FlashcardsImageSize;
};
const IMAGE_SIZE_MULTIPLIER: Record<FlashcardsImageSize, number> = {
    dynamic: 1,
    small: 0.4,
    medium: 0.6,
    large: 1,
    very_large: 1.7,
};

export function CardTrueFalse({
    promptText,
    promptImageUri,
    onAnswer,
    allowMultilinePrompt,
    showButtons = true,
    imageSizeMode = "dynamic",
}: CardTrueFalseProps) {
    const { colors } = useSettings();
    const styles = useMemo(() => makeStyles(colors), [colors]);

    const hasMath = useMemo(() => hasMathSegments(promptText), [promptText]);
    const hasText = useMemo(() => promptText.trim().length > 0, [promptText]);
    const hasImage = Boolean(promptImageUri);

    const promptImageStyle: ImageStyle = useMemo(() => {
        const fraction = IMAGE_SIZE_MULTIPLIER[imageSizeMode] ?? 1;
        const target = PROMPT_IMAGE_MAX_HEIGHT * fraction;
        return { height: target, maxHeight: target };
    }, [imageSizeMode]);

    return (
        <View
            style={[
                styles.container,
                !showButtons && styles.containerPromptOnly,
                hasImage ? styles.containerTop : styles.containerCentered,
            ]}
        >
            <View
                style={[
                    styles.promptContainer,
                    hasImage ? styles.promptContainerTop : styles.promptContainerCentered,
                    hasImage && hasText ? styles.promptContainerStacked : null,
                ]}
            >
                {promptImageUri ? (
                    <PromptImage
                        key={promptImageUri}
                        uri={promptImageUri}
                        imageStyle={[styles.promptImage, promptImageStyle]}
                    />
                ) : null}
                {hasText ? (
                    allowMultilinePrompt ? (
                        hasMath ? (
                            <CardMathText
                                text={promptText}
                                textStyle={styles.promptTextMulti}
                            />
                        ) : (
                            <Text
                                style={styles.promptTextMulti}
                            >
                                {promptText}
                            </Text>
                        )
                    ) : hasMath ? (
                        <CardMathText
                            text={promptText}
                            textStyle={styles.promptText}
                        />
                    ) : (
                        <Text
                            style={styles.promptText}
                            numberOfLines={2}
                            adjustsFontSizeToFit
                        >
                            {promptText}
                        </Text>
                    )
                ) : null}
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
            width: "100%",
            alignItems: "center",
            paddingVertical: 10,
        },
        containerPromptOnly: {
            minHeight: 100,
        },
        containerTop: {
            justifyContent: "flex-start",
        },
        containerCentered: {
            justifyContent: "center",
        },
        promptContainer: {
            alignItems: "center",
            paddingHorizontal: 16,
            width: "100%",
            gap: 10,
        },
        promptContainerCentered: {
            justifyContent: "center",
        },
        promptContainerTop: {
            justifyContent: "flex-start",
        },
        promptContainerStacked: {
            justifyContent: "flex-start",
            paddingTop: 8,
        },
        promptImage: {
            width: "90%",
            maxWidth: "90%",
            height: undefined,
            maxHeight: 140,
            borderRadius: 0,
            backgroundColor: "transparent",
            alignSelf: "center",
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
