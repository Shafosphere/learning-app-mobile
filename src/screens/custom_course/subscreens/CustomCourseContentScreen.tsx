import MyButton from "@/src/components/button/button";
import { DEFAULT_COURSE_COLOR } from "@/src/constants/customCourse";
import { usePopup } from "@/src/contexts/PopupContext";
import {
  createCustomCourse,
  replaceCustomFlashcards,
} from "@/src/db/sqlite/db";
import {
  ManualCardsEditor,
  ManualCardsEditorStyles,
} from "@/src/features/customCourse/manualCards/ManualCardsEditor";
import {
  createEmptyManualCard,
  normalizeAnswers,
  useManualCardsForm,
} from "@/src/features/customCourse/manualCards/useManualCardsForm";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Asset } from "expo-asset";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import Papa from "papaparse";
import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useStyles } from "../CustomCourseScreen-styles";

type AddMode = "csv" | "manual";

const sampleFileName = "custom_course_przyklad.csv";

const segmentOptions: { key: AddMode; label: string }[] = [
  { key: "csv", label: "Import z CSV" },
  { key: "manual", label: "Dodaj ręcznie" },
];

export default function CustomCourseContentScreen() {
  const styles = useStyles();
  const setPopup = usePopup();
  const router = useRouter();
  const params = useLocalSearchParams();

  const courseName = useMemo(() => {
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
  const reviewsEnabled = useMemo(() => {
    const raw = params.reviewsEnabled;
    if (raw == null) return false;
    const value = Array.isArray(raw) ? raw[0] : raw;
    const normalized = (value ?? "").toString().trim().toLowerCase();
    return normalized === "1" || normalized === "true";
  }, [params.reviewsEnabled]);

  const [addMode, setAddMode] = useState<AddMode>("manual");
  const {
    manualCards,
    replaceManualCards,
    handleManualCardFrontChange,
    handleManualCardAnswerChange,
    handleAddAnswer,
    handleRemoveAnswer,
    handleAddCard,
    handleRemoveCard,
  } = useManualCardsForm({
    initialCards: [createEmptyManualCard("card-0")],
  });
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSelectCsv = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/plain", "*/*"], // Allow CSV, plain text, or any file
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) {
        return;
      }
      const fileUri = picked.assets[0].uri;
      const fileName = picked.assets[0].name;
      setCsvFileName(fileName);
      const csvContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const parsed = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
      });
      if (parsed.errors.length > 0) {
        setPopup({
          message: "Błąd parsowania CSV",
          color: "my_red",
          duration: 4000,
        });
        return;
      }
      const cards = (parsed.data as any[]).map((row, idx) => ({
        id: `csv-${idx}`,
        front: (row.front || "").toString(),
        answers: [(row.back || "").toString()],
      }));
      if (!cards.length) {
        setPopup({
          message: "Brak danych w pliku CSV",
          color: "my_red",
          duration: 3000,
        });
        return;
      }
      replaceManualCards(cards);
      setPopup({
        message: `Zaimportowano ${cards.length} fiszek z pliku CSV`,
        color: "my_green",
        duration: 3500,
      });
    } catch (e) {
      setPopup({
        message: "Błąd importu CSV",
        color: "my_red",
        duration: 4000,
      });
      console.error("CSV import error", e);
    }
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

  const handleSaveCourse = async () => {
    if (addMode === "csv") {
      setPopup({
        message: "Import z CSV pojawi się w kolejnej wersji",
        color: "my_yellow",
        duration: 4000,
      });
      return;
    }

    const cleanName = courseName.trim();
    if (!cleanName) {
      setPopup({
        message: "Najpierw nadaj nazwę kursowi",
        color: "my_red",
        duration: 3000,
      });
      router.back();
      return;
    }
    if (!iconId) {
      setPopup({
        message: "Wybierz ikonę kursu",
        color: "my_red",
        duration: 3000,
      });
      router.back();
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
        message: "Dodaj przynajmniej jedną fiszkę",
        color: "my_red",
        duration: 3000,
      });
      return;
    }

    setIsSaving(true);
    try {
      const courseId = await createCustomCourse({
        name: cleanName,
        iconId,
        iconColor: iconColor || DEFAULT_COURSE_COLOR,
        colorId: colorId ?? undefined,
        reviewsEnabled,
      });

      await replaceCustomFlashcards(courseId, trimmedCards);

      setPopup({
        message: "Zestaw fiszek zapisany!",
        color: "my_green",
        duration: 3500,
      });
      router.replace("/coursepanel");
    } catch (error) {
      console.error("Failed to save custom course", error);
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
                Przygotuj plik CSV z kolumnami przód i tył oraz wypełnionymi
                danymi. Możesz również pobrać gotowy plik do wypełnienia
                (zalecam zrobić to na laptopie lub komputerze).
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
              <ManualCardsEditor
                manualCards={manualCards}
                styles={styles as unknown as ManualCardsEditorStyles}
                onCardFrontChange={handleManualCardFrontChange}
                onCardAnswerChange={handleManualCardAnswerChange}
                onAddAnswer={handleAddAnswer}
                onRemoveAnswer={handleRemoveAnswer}
                onAddCard={handleAddCard}
                onRemoveCard={handleRemoveCard}
              />
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <View style={styles.buttonsRow}>
          {/* <MyButton
            text="←"
            color="my_yellow"
            onPress={handleGoBack}
            accessibilityLabel="Wróć do tworzenia kursu"
          /> */}
          <MyButton
            color="my_yellow"
            onPress={handleGoBack}
            disabled={false}
            width={60}
            accessibilityLabel="Wróć do tworzenia kursu"
          >
            <Ionicons name="arrow-back" size={28} style={styles.returnbtn} />
          </MyButton>

          <MyButton
            text="Stwórz"
            color="my_green"
            onPress={handleSaveCourse}
            disabled={isSaving}
            accessibilityLabel="Stwórz kurs"
          />
        </View>
      </View>
    </View>
  );
}
