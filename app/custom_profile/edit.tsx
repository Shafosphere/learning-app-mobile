import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MyButton from "@/src/components/button/button";
import { useStyles } from "@/src/screens/custom_profile/styles_custom_profile";
import { usePopup } from "@/src/contexts/PopupContext";
import {
  getCustomFlashcards,
  getCustomProfileById,
  replaceCustomFlashcards,
  updateCustomProfile,
} from "@/src/components/db/db";
import { DEFAULT_PROFILE_COLOR } from "@/src/constants/customProfile";

type ManualCard = {
  id: string;
  front: string;
  back: string;
};

const MANUAL_HISTORY_LIMIT = 50;

const createEmptyManualCard = (id?: string): ManualCard => ({
  id: id ?? `card-${Date.now()}`,
  front: "",
  back: "",
});

const cloneManualCards = (cards: ManualCard[]): ManualCard[] =>
  cards.map((card) => ({ ...card }));

const areManualCardsEqual = (a: ManualCard[], b: ManualCard[]) => {
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    const cardA = a[index];
    const cardB = b[index];
    if (
      cardA.id !== cardB.id ||
      cardA.front !== cardB.front ||
      cardA.back !== cardB.back
    ) {
      return false;
    }
  }
  return true;
};

export default function EditCustomProfileScreen() {
  const styles = useStyles();
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
    } catch (error) {
      return str;
    }
  }, [params.name]);

  const [profileName, setProfileName] = useState(initialName);
  const [iconId, setIconId] = useState<string | null>(null);
  const [iconColor, setIconColor] = useState<string>(DEFAULT_PROFILE_COLOR);
  const [colorId, setColorId] = useState<string | null>(null);
  const [manualCards, setManualCards] = useState<ManualCard[]>(() => [
    createEmptyManualCard("card-0"),
  ]);
  const [manualHistory, setManualHistory] = useState<ManualCard[][]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const ensureAtLeastOneCard = useCallback((cards: ManualCard[]) => {
    return cards.length > 0 ? cards : [createEmptyManualCard()];
  }, []);

  const applyManualCardsChange = useCallback(
    (updater: (cards: ManualCard[]) => ManualCard[]) => {
      setManualCards((current) => {
        const workingCopy = cloneManualCards(current);
        const next = cloneManualCards(
          ensureAtLeastOneCard(updater(workingCopy))
        );

        if (areManualCardsEqual(current, next)) {
          return current;
        }

        setManualHistory((history) => {
          const nextHistory = [
            ...history,
            cloneManualCards(current),
          ];
          if (nextHistory.length > MANUAL_HISTORY_LIMIT) {
            nextHistory.shift();
          }
          return nextHistory;
        });

        return next;
      });
    },
    [ensureAtLeastOneCard]
  );

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
        const fallbackCards = [createEmptyManualCard("card-0")];
        setManualCards(cloneManualCards(fallbackCards));
        setManualHistory([]);
        setLoading(false);
        return;
      }

      setProfileName(profileRow.name);
      setIconId(profileRow.iconId);
      setIconColor(profileRow.iconColor ?? DEFAULT_PROFILE_COLOR);
      setColorId(profileRow.colorId);

      const incomingCards = cardRows.map((card, index) => ({
        id: `card-${card.id ?? index}`,
        front: card.frontText,
        back: card.backText,
      }));
      const normalizedCards = ensureAtLeastOneCard(incomingCards);
      const initialCards = cloneManualCards(normalizedCards);
      setManualCards(initialCards);
      setManualHistory([]);
    } catch (error) {
      console.error("Failed to load custom profile for edit", error);
      setLoadError("Nie udało się wczytać danych profilu.");
    } finally {
      setLoading(false);
    }
  }, [profileId, ensureAtLeastOneCard]);

  useFocusEffect(
    useCallback(() => {
      void hydrateFromDb();
    }, [hydrateFromDb])
  );

  const handleManualCardChange = (
    cardId: string,
    field: keyof Omit<ManualCard, "id">,
    value: string
  ) => {
    applyManualCardsChange((cards) =>
      cards.map((card) =>
        card.id === cardId ? { ...card, [field]: value } : card
      )
    );
  };

  const handleAddCard = () => {
    applyManualCardsChange((cards) => [...cards, createEmptyManualCard()]);
  };

  const handleRemoveCard = (cardId: string) => {
    applyManualCardsChange((cards) => {
      if (cards.length <= 1) return cards;
      return cards.filter((card) => card.id !== cardId);
    });
  };

  const hasManualChanges = manualHistory.length > 0;

  const handleUndoManualChanges = () => {
    if (manualHistory.length === 0) {
      return;
    }

    const previousSnapshot = manualHistory[manualHistory.length - 1];
    setManualHistory((history) => history.slice(0, -1));
    setManualCards(cloneManualCards(previousSnapshot));
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

    const trimmedCards = manualCards
      .map((card) => ({
        frontText: card.front.trim(),
        backText: card.back.trim(),
      }))
      .filter((card) => card.frontText || card.backText)
      .map((card, index) => ({
        ...card,
        position: index,
      }));

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
              </View>

              <View style={styles.modeContainer}>
                <Text style={styles.modeTitle}>Edytuj fiszki</Text>
                <View style={styles.manualHeader}>
                  <Text style={styles.manualHeaderCell}>przód</Text>
                  <Text style={styles.manualHeaderCell}>tył</Text>
                  <View style={styles.manualHeaderSpacer} />
                </View>
                <View style={styles.manualTable}>
                  {manualCards.map((card, index) => {
                    const isSingleCard = manualCards.length === 1;
                    const isLast = index === manualCards.length - 1;
                    return (
                      <View
                        key={card.id}
                        style={[
                          styles.manualRow,
                          isLast && styles.manualRowLast,
                        ]}
                      >
                        <View style={styles.manualCell}>
                          <TextInput
                            style={styles.manualInput}
                            multiline
                            value={card.front}
                            onChangeText={(value) =>
                              handleManualCardChange(card.id, "front", value)
                            }
                          />
                        </View>
                        <View style={styles.manualDivider} />
                        <View style={styles.manualCell}>
                          <TextInput
                            style={styles.manualInput}
                            multiline
                            value={card.back}
                            onChangeText={(value) =>
                              handleManualCardChange(card.id, "back", value)
                            }
                          />
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Usuń fiszkę"
                          accessibilityState={{ disabled: isSingleCard }}
                          style={[
                            styles.manualRemoveButton,
                            isSingleCard && styles.manualRemoveButtonDisabled,
                          ]}
                          disabled={isSingleCard}
                          onPress={() => handleRemoveCard(card.id)}
                        >
                          <Text style={styles.manualRemoveIcon}>✕</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
                <View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cofnij zmiany fiszek"
                    style={styles.manualAddButton}
                    accessibilityState={{ disabled: !hasManualChanges }}
                    disabled={!hasManualChanges}
                    onPress={handleUndoManualChanges}
                  >
                    <FontAwesome
                      name="undo"
                      size={24}
                      color={styles.manualAddIcon.color ?? "black"}
                      style={styles.manualAddIcon}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Dodaj nową fiszkę"
                    style={styles.manualAddButton}
                    onPress={handleAddCard}
                  >
                    <Text style={styles.manualAddIcon}>+</Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <MyButton
          text="Powrót"
          color="my_yellow"
          onPress={() => router.back()}
          accessibilityLabel="Wróć do panelu profili"
        />
        <MyButton
          text="Zapisz"
          color="my_green"
          onPress={handleSave}
          disabled={isSaving || loading || !!loadError}
          accessibilityLabel="Zapisz zmiany profilu"
        />
      </View>
    </View>
  );
}
