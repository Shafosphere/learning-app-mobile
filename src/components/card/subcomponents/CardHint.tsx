import { CourseTitleMarquee } from "@/src/components/course/CourseTitleMarquee";
import MyButton from "@/src/components/button/button";
import { useSettings } from "@/src/contexts/SettingsContext";
import { Animated, Pressable, Text, TextInput, View } from "react-native";
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
    onHintInputBlur: () => void;
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
    onHintInputBlur,
}: CardHintProps) {
    const styles = useStyles();
    const { colors } = useSettings();
    const canDelete = Boolean(currentHint);

    return (
        <View style={styles.hintContainer}>
            {!isEditingHint ? (
                <Pressable
                    onPress={startHintEditing}
                    hitSlop={8}
                    disabled={!selectedItem || !onHintUpdate}
                >
                    {currentHint ? (
                        shouldMarqueeHint ? (
                            <CourseTitleMarquee
                                text={currentHint}
                                textStyle={styles.hint}
                                containerStyle={styles.hintMarquee}
                            />
                        ) : (
                            <Text style={styles.hint}>{currentHint}</Text>
                        )
                    ) : (
                        <Text style={styles.dots}>...</Text>
                    )}
                </Pressable>
            ) : (
                <View style={styles.hintRow}>
                    <TextInput
                        value={hintDraft}
                        onChangeText={setHintDraft}
                        onSubmitEditing={finishHintEditing}
                        onBlur={onHintInputBlur}
                        placeholder="Wpisz podpowiedź..."
                        placeholderTextColor={colors.paragraph}
                        style={styles.hintInput}
                        autoFocus
                        returnKeyType="done"
                    />
                    <Animated.View style={[styles.hintActions, hintActionsStyle]}>
                        <MyButton
                            text={canDelete ? "Usuń" : "Anuluj"}
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
                            text="Zapisz"
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
}
