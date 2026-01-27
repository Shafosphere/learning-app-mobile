import { CourseTitleMarquee } from "@/src/components/course/CourseTitleMarquee";
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
                        <Pressable
                            onPress={canDelete ? deleteHint : cancelHintEditing}
                            style={({ pressed }) => [
                                styles.hintActionButton,
                                styles.hintActionGhost,
                                pressed && styles.hintActionPressed,
                            ]}
                        >
                            <Text style={styles.hintActionText}>
                                {canDelete ? "Usuń" : "Anuluj"}
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={finishHintEditing}
                            disabled={!hintDraft.trim()}
                            style={({ pressed }) => [
                                styles.hintActionButton,
                                (!hintDraft.trim() || pressed) && styles.hintActionPressed,
                                !hintDraft.trim() && styles.hintActionDisabled,
                            ]}
                        >
                            <Text style={styles.hintActionTextPrimaryAcept}>Zapisz</Text>
                        </Pressable>
                    </Animated.View>
                </View>
            )}
        </View>
    );
}
