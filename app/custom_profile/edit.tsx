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
import Feather from "@expo/vector-icons/Feather";
import { useEditStyles } from "@/src/screens/custom_profile/styles_edit_custom_profile";
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

type ManualCard = {
  id: string;
  front: string;
  answers: string[];
};

const MANUAL_HISTORY_LIMIT = 50;

const createEmptyManualCard = (id?: string): ManualCard => ({
  id: id ?? `card-${Date.now()}`,
  front: "",
  answers: [""],
});

const cloneManualCards = (cards: ManualCard[]): ManualCard[] =>
  cards.map((card) => ({ ...card, answers: [...card.answers] }));

const ensureCardHasAnswer = (card: ManualCard): ManualCard => {
  if (card.answers.length === 0) {
    return { ...card, answers: [""] };
  }
  return card;
};

const ensureCardsNormalized = (cards: ManualCard[]): ManualCard[] =>
  (cards.length > 0 ? cards : [createEmptyManualCard()]).map(
    ensureCardHasAnswer
  );

const areManualCardsEqual = (a: ManualCard[], b: ManualCard[]) => {
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    const cardA = a[index];
    const cardB = b[index];
    if (cardA.id !== cardB.id || cardA.front !== cardB.front) {
      return false;
    }
    if (cardA.answers.length !== cardB.answers.length) {
      return false;
    }
    for (
      let answerIndex = 0;
      answerIndex < cardA.answers.length;
      answerIndex += 1
    ) {
      if (cardA.answers[answerIndex] !== cardB.answers[answerIndex]) {
        return false;
      }
    }
  }
  return true;
};

const normalizeAnswers = (answers: string[]): string[] => {
  const deduped: string[] = [];
  for (const answer of answers) {
    const trimmed = answer.trim();
    if (!trimmed) {
      continue;
    }
    if (!deduped.includes(trimmed)) {
      deduped.push(trimmed);
    }
  }
  return deduped;
};

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
    return ensureCardsNormalized(cards);
  }, []);

  const applyManualCardsChange = useCallback(
    (updater: (cards: ManualCard[]) => ManualCard[]) => {
      setManualCards((current) => {
        const workingCopy = cloneManualCards(current);
        const updated = updater(workingCopy);
        const next = cloneManualCards(ensureAtLeastOneCard(updated));

        if (areManualCardsEqual(current, next)) {
          return current;
        }

        setManualHistory((history) => {
          const nextHistory = [...history, cloneManualCards(current)];
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

      const incomingCards = cardRows.map((card, index) => {
        const answersSource =
          card.answers && card.answers.length > 0
            ? card.answers
            : [card.backText ?? ""];
        const normalizedAnswersList = normalizeAnswers(answersSource);
        const answers =
          normalizedAnswersList.length > 0 ? normalizedAnswersList : [""];
        return ensureCardHasAnswer({
          id: `card-${card.id ?? index}`,
          front: card.frontText,
          answers,
        });
      });
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

  const handleManualCardFrontChange = (cardId: string, value: string) => {
    applyManualCardsChange((cards) =>
      cards.map((card) =>
        card.id === cardId ? { ...card, front: value } : card
      )
    );
  };

  const handleManualCardAnswerChange = (
    cardId: string,
    answerIndex: number,
    value: string
  ) => {
    applyManualCardsChange((cards) =>
      cards.map((card) => {
        if (card.id !== cardId) {
          return card;
        }
        const nextAnswers = [...card.answers];
        nextAnswers[answerIndex] = value;
        return { ...card, answers: nextAnswers };
      })
    );
  };

  const handleAddAnswer = (cardId: string) => {
    applyManualCardsChange((cards) =>
      cards.map((card) =>
        card.id === cardId ? { ...card, answers: [...card.answers, ""] } : card
      )
    );
  };

  const handleRemoveAnswer = (cardId: string, answerIndex: number) => {
    applyManualCardsChange((cards) =>
      cards.map((card) => {
        if (card.id !== cardId) {
          return card;
        }
        if (card.answers.length <= 1) {
          return card;
        }
        const nextAnswers = card.answers.filter(
          (_, index) => index !== answerIndex
        );
        return ensureCardHasAnswer({ ...card, answers: nextAnswers });
      })
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

    const trimmedCards = manualCards.reduce<
      Array<{
        frontText: string;
        backText: string;
        answers: string[];
        position: number;
      }>
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
                {manualCards.map((card, index) => {
                  const isFirst = index === 0;

                  return (
                    <View
                      key={card.id}
                      style={[styles.card, isFirst && styles.cardFirst]}
                    >
                      <Text style={styles.number}>{index + 1}</Text>
                      <View style={styles.inputContainer}>
                        <TextInput
                          value={card.front}
                          style={styles.cardinput}
                          placeholder="przód"
                          placeholderTextColor={styles.cardPlaceholder.color}
                          onChangeText={(value) =>
                            handleManualCardFrontChange(card.id, value)
                          }
                        />
                        <View style={styles.cardDivider} />
                        <View style={styles.answersContainer}>
                          {card.answers.map((answer, answerIndex) => {
                            const placeholder =
                              answerIndex === 0
                                ? "tył"
                                : `tył ${answerIndex + 1}`;
                            return (
                              <View
                                key={`${card.id}-answer-${answerIndex}`}
                                style={styles.answerRow}
                              >
                                <Text style={styles.answerIndex}>
                                  {answerIndex + 1}.
                                </Text>
                                <TextInput
                                  value={answer}
                                  style={styles.answerInput}
                                  placeholder={placeholder}
                                  placeholderTextColor={
                                    styles.cardPlaceholder.color
                                  }
                                  onChangeText={(value) =>
                                    handleManualCardAnswerChange(
                                      card.id,
                                      answerIndex,
                                      value
                                    )
                                  }
                                />
                                {card.answers.length > 1 && (
                                  <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={`Usuń odpowiedź ${
                                      answerIndex + 1
                                    } dla fiszki ${index + 1}`}
                                    style={styles.answerRemoveButton}
                                    hitSlop={8}
                                    onPress={() =>
                                      handleRemoveAnswer(card.id, answerIndex)
                                    }
                                  >
                                    <Feather
                                      name="minus-circle"
                                      size={20}
                                      color={
                                        styles.cardActionIcon.color ?? "black"
                                      }
                                    />
                                  </Pressable>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      </View>
                      <View style={styles.cardActions}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Usuń fiszkę ${index + 1}`}
                          style={[
                            styles.cardActionButton,
                            manualCards.length <= 1 &&
                              styles.removeButtonDisabled,
                          ]}
                          hitSlop={8}
                          disabled={manualCards.length <= 1}
                          onPress={() => handleRemoveCard(card.id)}
                        >
                          <Feather
                            name="trash-2"
                            size={24}
                            color={styles.cardActionIcon.color ?? "black"}
                          />
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Dodaj tłumaczenie dla fiszki ${
                            index + 1
                          }`}
                          style={styles.cardActionButton}
                          hitSlop={8}
                          onPress={() => handleAddAnswer(card.id)}
                        >
                          <Feather
                            name="plus"
                            size={24}
                            color={styles.cardActionIcon.color ?? "black"}
                          />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}

                <View style={styles.buttonContainer}>
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
