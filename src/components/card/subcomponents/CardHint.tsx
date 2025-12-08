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
    hintActionsStyle: any;
    shouldMarqueeHint: boolean;
    selectedItem: any;
    onHintUpdate: any;
};

export function CardHint({
    currentHint,
    isEditingHint,
    hintDraft,
    setHintDraft,
    startHintEditing,
    cancelHintEditing,
    finishHintEditing,
    hintActionsStyle,
    shouldMarqueeHint,
    selectedItem,
    onHintUpdate,
}: CardHintProps) {
    const styles = useStyles();
    const { colors } = useSettings();

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
                        placeholder="Wpisz podpowiedź..."
                        placeholderTextColor={colors.paragraph}
                        style={styles.hintInput}
                        autoFocus
                        returnKeyType="done"
                    />
                    <Animated.View style={[styles.hintActions, hintActionsStyle]}>
                        <Pressable
                            onPress={cancelHintEditing}
                            style={({ pressed }) => [
                                styles.hintActionButton,
                                styles.hintActionGhost,
                                pressed && styles.hintActionPressed,
                            ]}
                        >
                            <Text style={styles.hintActionText}>Anuluj</Text>
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
