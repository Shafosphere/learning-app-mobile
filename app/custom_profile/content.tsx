import { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import MyButton from "@/src/components/button/button";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useStyles } from "@/src/screens/custom_profile/styles_custom_profile";
import { usePopup } from "@/src/contexts/PopupContext";
import {
  createCustomProfile,
  replaceCustomFlashcards,
} from "@/src/components/db/db";
import { DEFAULT_PROFILE_COLOR } from "@/src/constants/customProfile";

type AddMode = "csv" | "manual";

interface ManualCard {
  id: string;
  front: string;
  answers: string[];
}

const createEmptyManualCard = (id?: string): ManualCard => ({
  id: id ?? `card-${Date.now()}`,
  front: "",
  answers: [""],
});

const ensureCardHasAnswer = (card: ManualCard): ManualCard =>
  card.answers.length === 0 ? { ...card, answers: [""] } : card;

const ensureCardsNormalized = (cards: ManualCard[]): ManualCard[] =>
  (cards.length > 0 ? cards : [createEmptyManualCard()]).map(ensureCardHasAnswer);

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

const sampleFileName = "custom_profile_przyklad.csv";

const segmentOptions: { key: AddMode; label: string }[] = [
  { key: "csv", label: "Import z CSV" },
  { key: "manual", label: "Dodaj ręcznie" },
];

export default function CustomProfileContentScreen() {
  const styles = useStyles();
  const setPopup = usePopup();
  const router = useRouter();
  const params = useLocalSearchParams();

  const profileName = useMemo(() => {
    const raw = params.name;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return (value ?? "").toString().trim();
  }, [params.name]);
  const iconId = useMemo(() => {
    const raw = params.iconId;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return (value ?? "").toString().trim();
  }, [params.iconId]);
  const iconColor = useMemo(() => {
    const raw = params.iconColor;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return (value ?? "").toString().trim();
  }, [params.iconColor]);
  const colorId = useMemo(() => {
    const raw = params.colorId;
    if (raw == null) return null;
    const value = Array.isArray(raw) ? raw[0] : raw;
    const trimmed = (value ?? "").toString().trim();
    return trimmed.length > 0 ? trimmed : null;
  }, [params.colorId]);

  const [addMode, setAddMode] = useState<AddMode>("manual");
  const [manualCards, setManualCards] = useState<ManualCard[]>(() =>
    ensureCardsNormalized([createEmptyManualCard("card-0")])
  );
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleManualCardFrontChange = (cardId: string, value: string) => {
    setManualCards((cards) =>
      ensureCardsNormalized(
        cards.map((card) =>
          card.id === cardId ? { ...card, front: value } : card
        )
      )
    );
  };

  const handleManualCardAnswerChange = (
    cardId: string,
    answerIndex: number,
    value: string
  ) => {
    setManualCards((cards) =>
      ensureCardsNormalized(
        cards.map((card) => {
          if (card.id !== cardId) {
            return card;
          }
          const answers = [...card.answers];
          answers[answerIndex] = value;
          return { ...card, answers };
        })
      )
    );
  };

  const handleAddAnswer = (cardId: string) => {
    setManualCards((cards) =>
      ensureCardsNormalized(
        cards.map((card) =>
          card.id === cardId
            ? { ...card, answers: [...card.answers, ""] }
            : card
        )
      )
    );
  };

  const handleRemoveAnswer = (cardId: string, answerIndex: number) => {
    setManualCards((cards) =>
      ensureCardsNormalized(
        cards.map((card) => {
          if (card.id !== cardId) {
            return card;
          }
          if (card.answers.length <= 1) {
            return card;
          }
          const nextAnswers = card.answers.filter((_, index) => index !== answerIndex);
          return ensureCardHasAnswer({ ...card, answers: nextAnswers });
        })
      )
    );
  };

  const handleAddCard = () => {
    setManualCards((cards) =>
      ensureCardsNormalized([...cards, createEmptyManualCard()])
    );
  };

  const handleRemoveCard = (cardId: string) => {
    setManualCards((cards) => {
      if (cards.length <= 1) {
        return cards;
      }
      const filtered = cards.filter((card) => card.id !== cardId);
      return ensureCardsNormalized(filtered);
    });
  };

  const handleSelectCsv = () => {
    setCsvFileName("twoj_plik.csv");
    setPopup({
      message: "Wybieranie pliku dostępne w przyszłej wersji",
      color: "my_yellow",
      duration: 3000,
    });
  };

  const readSampleCsv = async () => {
    const asset = Asset.fromModule(require("@/assets/data/import.csv"));
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    return FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  };

  const handleDownloadSample = async () => {
    try {
      const sampleContent = await readSampleCsv();

      if (Platform.OS === "android") {
        const permissions =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (permissions.granted && permissions.directoryUri) {
          const targetFileUri =
            await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              sampleFileName,
              "text/csv"
            );

          await FileSystem.writeAsStringAsync(targetFileUri, sampleContent, {
            encoding: FileSystem.EncodingType.UTF8,
          });

          setPopup({
            message: "Plik zapisany w wybranym katalogu",
            color: "my_green",
            duration: 3000,
          });
          return;
        }
      }

      const destination = `${FileSystem.documentDirectory}${sampleFileName}`;
      await FileSystem.writeAsStringAsync(destination, sampleContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      setPopup({
        message: "Plik zapisany w pamięci aplikacji",
        color: "my_green",
        duration: 4000,
      });
    } catch (error) {
      console.error("Failed to export sample CSV", error);
      setPopup({
        message: "Nie udało się zapisać pliku",
        color: "my_red",
        duration: 4000,
      });
    }
  };

  const handleSaveProfile = async () => {
    if (addMode === "csv") {
      setPopup({
        message: "Import z CSV pojawi się w kolejnej wersji",
        color: "my_yellow",
        duration: 4000,
      });
      return;
    }

    const cleanName = profileName.trim();
    if (!cleanName) {
      setPopup({
        message: "Najpierw nadaj nazwę profilowi",
        color: "my_red",
        duration: 3000,
      });
      router.back();
      return;
    }
    if (!iconId) {
      setPopup({
        message: "Wybierz ikonę profilu",
        color: "my_red",
        duration: 3000,
      });
      router.back();
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
        message: "Dodaj przynajmniej jedną fiszkę",
        color: "my_red",
        duration: 3000,
      });
      return;
    }

    setIsSaving(true);
    try {
      const profileId = await createCustomProfile({
        name: cleanName,
        iconId,
        iconColor: iconColor || DEFAULT_PROFILE_COLOR,
        colorId: colorId ?? undefined,
      });

      await replaceCustomFlashcards(profileId, trimmedCards);

      setPopup({
        message: "Zestaw fiszek zapisany!",
        color: "my_green",
        duration: 3500,
      });
      router.replace("/profilpanel");
    } catch (error) {
      console.error("Failed to save custom profile", error);
      setPopup({
        message: "Nie udało się zapisać zestawu",
        color: "my_red",
        duration: 4000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        // contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ZAWARTOSC</Text>
          <View style={styles.segmentedControl}>
            {segmentOptions.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => setAddMode(option.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: addMode === option.key }}
                style={({ pressed }) => [
                  styles.segmentOption,
                  addMode === option.key && styles.segmentOptionActive,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={[
                    styles.segmentOptionLabel,
                    addMode === option.key && styles.segmentOptionLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {addMode === "csv" ? (
            <View style={styles.modeContainer}>
              <Text style={styles.modeTitle}>Import z pliku CSV</Text>
              <Text style={styles.modeDescription}>
                Przygotuj plik CSV z kolumnami "przód" i "tył" oraz wypełnionymi
                danymi. Możesz również pobrać gotowy plik do wypełnienia (zalecam
                zrobić to na laptopie lub komputerze).
              </Text>
              <View style={styles.modeActions}>
                <MyButton
                  text="Importuj"
                  onPress={handleSelectCsv}
                  accessibilityLabel="Wybierz plik CSV z dysku"
                  width={125}
                />
                <MyButton
                  text="Pobierz"
                  color="my_yellow"
                  onPress={handleDownloadSample}
                  accessibilityLabel="Pobierz przykładowy plik CSV"
                  width={125}
                />
              </View>
              {csvFileName && (
                <Text style={styles.csvSelectedFile}>
                  Wybrany plik: {csvFileName}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.modeContainer}>
              {/* <Text style={styles.modeTitle}>Stwórz tutaj</Text> */}
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
                  accessibilityLabel="Dodaj nową fiszkę"
                  style={styles.manualAddButton}
                  onPress={handleAddCard}
                >
                  <Text style={styles.manualAddIcon}>+</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <MyButton
          text="←"
          color="my_yellow"
          onPress={handleGoBack}
          accessibilityLabel="Wróć do tworzenia profilu"
        />
        <MyButton
          text="Stwórz"
          color="my_green"
          onPress={handleSaveProfile}
          disabled={isSaving}
          accessibilityLabel="Stwórz talię"
        />
      </View>
    </View>
  );
}
