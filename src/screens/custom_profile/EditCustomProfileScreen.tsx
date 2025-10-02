import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TextStyle,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MyButton from "@/src/components/button/button";
import { useEditStyles } from "./editStyles";
import { usePopup } from "@/src/contexts/PopupContext";
import {
  getCustomFlashcards,
  getCustomProfileById,
  replaceCustomFlashcards,
  updateCustomProfile,
} from "@/src/components/db/db";
import {
  DEFAULT_PROFILE_COLOR,
  PROFILE_COLORS,
  PROFILE_ICONS,
} from "@/src/constants/customProfile";
import {
  ManualCardsEditor,
  ManualCardsEditorStyles,
} from "@/src/features/customProfile/manualCards/ManualCardsEditor";
import {
  createEmptyManualCard,
  ensureCardsNormalized,
  normalizeAnswers,
  useManualCardsForm,
} from "@/src/features/customProfile/manualCards/useManualCardsForm";

const MANUAL_HISTORY_LIMIT = 50;

export default function EditCustomProfileScreen() {
  const styles = useEditStyles();
  const params = useLocalSearchParams();
  const router = useRouter();
  const setPopup = usePopup();

  const profileId = useMemo(() => {
    const raw = params.id;
    const value = Array.isArray(raw) ? raw[0] : raw;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [params.id]);

  const initialName = useMemo(() => {
    const raw = params.name;
    const value = Array.isArray(raw) ? raw[0] : raw;
    const str = (value ?? "").toString();
    try {
      return decodeURIComponent(str);
    } catch {
      return str;
    }
  }, [params.name]);

  const [profileName, setProfileName] = useState(initialName);
  const [iconId, setIconId] = useState<string | null>(null);
  const [iconColor, setIconColor] = useState<string>(DEFAULT_PROFILE_COLOR);
  const [colorId, setColorId] = useState<string | null>(null);
  const {
    manualCards,
    replaceManualCards,
    handleManualCardFrontChange,
    handleManualCardAnswerChange,
    handleAddAnswer,
    handleRemoveAnswer,
    handleAddCard,
    handleRemoveCard,
    canUndo,
    undo,
  } = useManualCardsForm({
    initialCards: [createEmptyManualCard("card-0")],
    enableHistory: true,
    historyLimit: MANUAL_HISTORY_LIMIT,
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const hydrateFromDb = useCallback(async () => {
    if (!profileId) {
      setLoadError("Nie znaleziono profilu do edycji.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [profileRow, cardRows] = await Promise.all([
        getCustomProfileById(profileId),
        getCustomFlashcards(profileId),
      ]);

      if (!profileRow) {
        setLoadError("Profil nie istnieje.");
        replaceManualCards([createEmptyManualCard("card-0")]);
        setLoading(false);
        return;
      }

      setProfileName(profileRow.name);
      setIconId(profileRow.iconId);
      setIconColor(profileRow.iconColor ?? DEFAULT_PROFILE_COLOR);
      setColorId(profileRow.colorId);

      const incomingCards = cardRows.map((card, index) => {
        const answersSource =
          card.answers && card.answers.length > 0
            ? card.answers
            : [card.backText ?? ""];
        const normalizedAnswersList = normalizeAnswers(answersSource);
        const answers =
          normalizedAnswersList.length > 0 ? normalizedAnswersList : [""];
        return {
          id: `card-${card.id ?? index}`,
          front: card.frontText,
          answers,
        };
      });
      const normalizedCards = ensureCardsNormalized(incomingCards);
      replaceManualCards(normalizedCards);
    } catch (error) {
      console.error("Failed to load custom profile for edit", error);
      setLoadError("Nie udało się wczytać danych profilu.");
    } finally {
      setLoading(false);
    }
  }, [profileId, replaceManualCards]);

  useFocusEffect(
    useCallback(() => {
      void hydrateFromDb();
    }, [hydrateFromDb])
  );

  const undoButtonColor =
    ((styles.manualAddIcon as TextStyle)?.color ??
      (styles.cardActionIcon as TextStyle)?.color ??
      undefined) ?? "black";

  const hasManualChanges = canUndo;

  const handleUndoManualChanges = () => {
    if (!canUndo) {
      return;
    }

    undo();
    setPopup({
      message: "Cofnięto ostatnią zmianę",
      color: "my_yellow",
      duration: 2500,
    });
  };

  const handleSave = async () => {
    if (!profileId) {
      setPopup({
        message: "Nie można zapisać – brak identyfikatora profilu",
        color: "my_red",
        duration: 4000,
      });
      return;
    }

    const cleanName = profileName.trim();
    if (!cleanName) {
      setPopup({
        message: "Podaj nazwę profilu",
        color: "my_red",
        duration: 3000,
      });
      return;
    }

    const trimmedCards = manualCards.reduce<
      {
        frontText: string;
        backText: string;
        answers: string[];
        position: number;
      }[]
    >((acc, card) => {
      const frontText = card.front.trim();
      const answers = normalizeAnswers(card.answers);
      if (!frontText && answers.length === 0) {
        return acc;
      }
      const backText = answers[0] ?? "";
      acc.push({
        frontText,
        backText,
        answers,
        position: acc.length,
      });
      return acc;
    }, []);

    if (trimmedCards.length === 0) {
      setPopup({
        message: "Dodaj co najmniej jedną fiszkę",
        color: "my_red",
        duration: 3000,
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateCustomProfile(profileId, {
        name: cleanName,
        iconId: iconId ?? "heart",
        iconColor,
        colorId: colorId ?? undefined,
      });

      await replaceCustomFlashcards(profileId, trimmedCards);

      setPopup({
        message: "Zmiany zapisane!",
        color: "my_green",
        duration: 3500,
      });
      router.back();
    } catch (error) {
      console.error("Failed to save custom profile", error);
      setPopup({
        message: "Nie udało się zapisać zmian",
        color: "my_red",
        duration: 4000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>EDYTUJ PROFIL</Text>
          {loading ? (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <ActivityIndicator size="large" />
            </View>
          ) : loadError ? (
            <Text style={{ color: "#ff5470", fontSize: 16 }}>{loadError}</Text>
          ) : (
            <>
              <View>
                <Text style={styles.miniSectionHeader}>nazwa</Text>
                <TextInput
                  style={styles.profileInput}
                  value={profileName}
                  onChangeText={setProfileName}
                  placeholder="np. Fiszki podróżnicze"
                  accessibilityLabel="Nazwa profilu"
                />

                <View style={styles.iconContainer}>
                  <Text style={styles.miniSectionHeader}>ikona</Text>

                  <View style={styles.imageContainer}>
                    {PROFILE_ICONS.map(({ id, Component, name }) => {
                      const isSelected = iconId === id;
                      return (
                        <Pressable
                          key={id}
                          accessibilityRole="button"
                          accessibilityLabel={`Ikona ${name}`}
                          onPress={() => setIconId(id)}
                          style={[
                            styles.iconWrapper,
                            isSelected && styles.iconWrapperSelected,
                          ]}
                        >
                          <Component
                            name={name as never}
                            size={40}
                            color={iconColor}
                          />
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.colorsContainer}>
                    {PROFILE_COLORS.map((color) => {
                      const isSelected = iconColor === color.hex;
                      return (
                        <Pressable
                          key={color.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Kolor ${color.label}`}
                          onPress={() => {
                            setIconColor(color.hex);
                            setColorId(color.id);
                          }}
                          style={[
                            styles.profileColor,
                            { backgroundColor: color.hex },
                            isSelected && styles.profileColorSelected,
                          ]}
                        />
                      );
                    })}
                  </View>
                </View>

                <Text style={styles.miniSectionHeader}>fiszki</Text>
                <ManualCardsEditor
                  manualCards={manualCards}
                  styles={styles as unknown as ManualCardsEditorStyles}
                  onCardFrontChange={handleManualCardFrontChange}
                  onCardAnswerChange={handleManualCardAnswerChange}
                  onAddAnswer={handleAddAnswer}
                  onRemoveAnswer={handleRemoveAnswer}
                  onAddCard={handleAddCard}
                  onRemoveCard={handleRemoveCard}
                  actionButtons={[
                    {
                      key: "undo",
                      onPress: handleUndoManualChanges,
                      accessibilityLabel: "Cofnij zmiany fiszek",
                      content: (
                        <FontAwesome
                          name="undo"
                          size={24}
                          color={undoButtonColor}
                          style={styles.manualAddIcon}
                        />
                      ),
                      disabled: !hasManualChanges,
                    },
                  ]}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <MyButton
          text="<-"
          color="my_yellow"
          onPress={() => router.back()}
          accessibilityLabel="Wróć do panelu profili"
        />
        <MyButton
          text="zapisz zmainy"
          color="my_green"
          width={190}
          onPress={handleSave}
          disabled={isSaving || loading || !!loadError}
          accessibilityLabel="Zapisz zmiany profilu"
        />
      </View>
    </View>
  );
}
