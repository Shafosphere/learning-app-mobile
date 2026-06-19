import { CourseTitleMarquee } from "@/src/components/course/CourseTitleMarquee";
import MyButton from "@/src/components/button/button";
import { useSettings } from "@/src/contexts/SettingsContext";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";
import { Animated, Pressable, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useStyles } from "../card-styles";

type CardHintProps = {
    currentHint: string | null;
    isEditingHint: boolean;
    hintDraft: string;
    setHintDraft: (text: string) => void;
    startHintEditing: () => void;
    cancelHintEditing: () => void;
    finishHintEditing: () => void;
    deleteHint: () => void;
    hintActionsStyle: any;
    shouldMarqueeHint: boolean;
    selectedItem: any;
    onHintUpdate: any;
    inputRef?: React.RefObject<TextInput | null>;
    onHintInputBlur: () => void;
    hintCoachmarkId?: string;
    shouldStartHintEditing?: () => boolean;
    cardWidth?: number;
};

export function CardHint({
    currentHint,
    isEditingHint,
    hintDraft,
    setHintDraft,
    startHintEditing,
    cancelHintEditing,
    finishHintEditing,
    deleteHint,
    hintActionsStyle,
    shouldMarqueeHint,
    selectedItem,
    onHintUpdate,
    inputRef,
    onHintInputBlur,
    hintCoachmarkId,
    shouldStartHintEditing,
    cardWidth,
}: CardHintProps) {
    const styles = useStyles();
    const { colors } = useSettings();
    const { t } = useTranslation();
    const canDelete = Boolean(currentHint);
    const widthStyle = cardWidth != null ? { width: cardWidth } : null;

    const handleStartHintEditing = () => {
        if (shouldStartHintEditing?.() === false) {
            return;
        }
        startHintEditing();
    };

    const content = (
        <View style={[styles.hintContainer, widthStyle]}>
            {!isEditingHint ? (
                <Pressable
                    onPress={handleStartHintEditing}
                    hitSlop={8}
                    disabled={!selectedItem || !onHintUpdate}
                    accessibilityRole="button"
                    accessibilityLabel={
                        currentHint
                            ? t("flashcards.card.hint.editA11yValue", {
                                hint: currentHint,
                            })
                            : t("flashcards.card.hint.addA11y")
                    }
                    accessibilityState={{ disabled: !selectedItem || !onHintUpdate }}
                >
                    {currentHint ? (
                        shouldMarqueeHint ? (
                            <CourseTitleMarquee
                                text={currentHint}
                                textStyle={[styles.hint, widthStyle]}
                                containerStyle={[styles.hintMarquee, widthStyle]}
                            />
                        ) : (
                            <Text style={[styles.hint, widthStyle]}>{currentHint}</Text>
                        )
                    ) : (
                        <Text style={[styles.dots, widthStyle]}>...</Text>
                    )}
                </Pressable>
            ) : (
                <View style={[styles.hintRow, widthStyle]}>
                    <TextInput
                        ref={inputRef}
                        value={hintDraft}
                        onChangeText={setHintDraft}
                        onSubmitEditing={finishHintEditing}
                        onBlur={onHintInputBlur}
                        placeholder={t("flashcards.card.hint.placeholder")}
                        placeholderTextColor={colors.paragraph}
                        style={styles.hintInput}
                        returnKeyType="done"
                    />
                    <Animated.View style={[styles.hintActions, hintActionsStyle]}>
                        <MyButton
                            text={canDelete ? t("app.actions.delete") : t("app.actions.cancel")}
                            onPress={canDelete ? deleteHint : cancelHintEditing}
                            color="secondBackground"
                            width="auto"
                            style={[
                                styles.hintActionButton,
                                styles.hintActionGhost,
                            ]}
                            pressedStyle={styles.hintActionPressed}
                            textStyle={[
                                styles.hintActionText,
                                styles.hintActionTextNoTransform,
                            ]}
                        />
                        <MyButton
                            text={t("flashcards.card.hint.save")}
                            onPress={finishHintEditing}
                            disabled={!hintDraft.trim()}
                            color="secondBackground"
                            width="auto"
                            style={[
                                styles.hintActionButton,
                                !hintDraft.trim() && styles.hintActionDisabled,
                            ]}
                            pressedStyle={styles.hintActionPressed}
                            textStyle={[
                                styles.hintActionTextPrimaryAcept,
                                styles.hintActionTextNoTransform,
                                !hintDraft.trim() && styles.hintActionDisabled,
                            ]}
                        />
                    </Animated.View>
                </View>
            )}
        </View>
    );

    if (!hintCoachmarkId) {
        return content;
    }

    return (
        <CoachmarkAnchor id={hintCoachmarkId} shape="rect" radius={14}>
            {content}
        </CoachmarkAnchor>
    );
}
