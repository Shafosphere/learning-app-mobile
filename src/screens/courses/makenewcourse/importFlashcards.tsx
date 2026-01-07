import MyButton from "@/src/components/button/button";
import { DEFAULT_COURSE_COLOR } from "@/src/constants/customCourse";
import { usePopup } from "@/src/contexts/PopupContext";
import {
  createCustomCourse,
  replaceCustomFlashcards,
} from "@/src/db/sqlite/db";
import {
  createEmptyManualCard,
  normalizeAnswers,
  useManualCardsForm,
  type ManualCard,
} from "@/src/hooks/useManualCardsForm";
import {
  ManualCardsEditor,
  ManualCardsEditorStyles,
} from "@/src/screens/courses/editcourse/components/editFlashcards/editFlashcards";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Asset } from "expo-asset";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import JSZip, { JSZipObject } from "jszip";
import Papa from "papaparse";
import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { importImageFromZip, saveImage } from "@/src/services/imageService";
import { useStyles } from "./importFlashcards-styles";
import sampleCsvAsset from "@/assets/data/import.csv";

type AddMode = "csv" | "manual";

const sampleFileName = "custom_course_przyklad.csv";

const TRUE_VALUES = new Set([
  "true",
  "1",
  "yes",
  "y",
  "tak",
  "t",
  "locked",
]);

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
    handleToggleFlipped,
    handleManualCardImageChange,
  } = useManualCardsForm({
    initialCards: [createEmptyManualCard("card-0")],
  });
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const parseBooleanValue = (value: unknown): boolean => {
    if (value == null) return false;
    const normalized = value.toString().trim().toLowerCase();
    return TRUE_VALUES.has(normalized);
  };

  const parseAnswers = (raw: unknown): string[] => {
    const normalized = (raw ?? "").toString().trim();
    if (!normalized) return [];
    const parts = normalized
      .split(/[;,|\n]/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    if (parts.length === 0) return [normalized];

    const deduped: string[] = [];
    const seen = new Set<string>();
    for (const value of parts) {
      if (!seen.has(value)) {
        deduped.push(value);
        seen.add(value);
      }
    }
    return deduped;
  };

  const normalizeImageField = (raw: unknown): string | null => {
    const value = (raw ?? "").toString().trim();
    return value.length > 0 ? value : null;
  };

  const buildManualCardsFromRows = async (
    rows: any[],
    resolveImage?: (name: string | null) => Promise<string | null>
  ): Promise<ManualCard[]> => {
    const cards: ManualCard[] = [];
    for (let idx = 0; idx < rows.length; idx += 1) {
      const row = rows[idx];
      const answers = parseAnswers(row.back);
      const locked = parseBooleanValue(row.lock);
      const answerOnly = parseBooleanValue(
        row.answer_only ?? row.question ?? row.pytanie
      );
      const imageFrontName = normalizeImageField(row.image_front ?? row.imageFront);
      const imageBackName = normalizeImageField(row.image_back ?? row.imageBack);
      const imageFront = resolveImage ? await resolveImage(imageFrontName) : null;
      const imageBack = resolveImage ? await resolveImage(imageBackName) : null;

      const card: ManualCard = {
        id: `csv-${idx}`,
        front: (row.front || "").toString(),
        answers: answers.length > 0 ? answers : [(row.back || "").toString()],
        flipped: !locked,
        answerOnly,
        hintFront: (row.hint1 ?? row.hint_front ?? "").toString(),
        hintBack: (row.hint2 ?? row.hint_back ?? "").toString(),
        imageFront,
        imageBack,
      };

      if (
        card.front.trim().length > 0 ||
        card.answers.some((a) => a.trim().length > 0)
      ) {
        cards.push(card);
      }
    }
    return cards;
  };

  const handleZipImport = async (fileUri: string, fileName?: string | null) => {
    try {
      const zipBase64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const zip = await JSZip.loadAsync(zipBase64, { base64: true });
      const csvEntry =
        zip.file("data.csv")?.[0] ??
        zip.file(/\.csv$/i)?.[0];
      if (!csvEntry) {
        setPopup({
          message: "Brak pliku CSV w archiwum ZIP",
          color: "angry",
          duration: 4000,
        });
        return;
      }

      const csvContent = await csvEntry.async("string");
      const parsed = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
      });
      if (parsed.errors.length > 0) {
        setPopup({
          message: "Błąd parsowania CSV z ZIP",
          color: "angry",
          duration: 4000,
        });
        return;
      }

      const imageCache = new Map<string, string | null>();
      const resolveZipImage = async (
        name: string | null
      ): Promise<string | null> => {
        if (!name) return null;
        if (imageCache.has(name)) {
          return imageCache.get(name) ?? null;
        }
        const normalized = name.replace(/^images[\\/]/i, "");
        const candidates = [
          `images/${normalized}`,
          `images\\${normalized}`,
          normalized,
        ];
        let entry: JSZipObject | null = null;
        for (const candidate of candidates) {
          const match = zip.file(candidate);
          if (match && match.length > 0) {
            entry = match[0];
            break;
          }
        }
        if (!entry) {
          imageCache.set(name, null);
          return null;
        }
        try {
          const base64 = await entry.async("base64");
          const saved = await importImageFromZip(base64, normalized);
          imageCache.set(name, saved);
          return saved;
        } catch (error) {
          console.warn("[Import ZIP] Failed to persist image", {
            name,
            error,
          });
          imageCache.set(name, null);
          return null;
        }
      };

      const cards = await buildManualCardsFromRows(
        parsed.data as any[],
        resolveZipImage
      );
      if (cards.length === 0) {
        setPopup({
          message: "Brak danych w pliku ZIP",
          color: "angry",
          duration: 3000,
        });
        return;
      }

      replaceManualCards(cards);
      setPopup({
        message: `Zaimportowano ${cards.length} fiszek z ZIP`,
        color: "calm",
        duration: 3500,
      });
    } catch (error) {
      console.error("ZIP import error", error);
      setPopup({
        message: "Błąd importu ZIP",
        color: "angry",
        duration: 4000,
      });
    }
  };

  const handleSelectCsv = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/plain", "application/zip", "application/x-zip-compressed", "*/*"], // Allow CSV, ZIP, or any file
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) {
        return;
      }
      const fileUri = picked.assets[0].uri;
      const fileName = picked.assets[0].name;
      setCsvFileName(fileName);
      if (fileName?.toLowerCase().endsWith(".zip")) {
        await handleZipImport(fileUri, fileName);
        return;
      }

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
          color: "angry",
          duration: 4000,
        });
        return;
      }

      const externalResolver = (() => {
        const cache = new Map<string, string | null>();
        return async (name: string | null): Promise<string | null> => {
          if (!name) return null;
          if (cache.has(name)) {
            return cache.get(name) ?? null;
          }
          if (
            name.startsWith("file://") ||
            name.startsWith("content://")
          ) {
            try {
              const saved = await saveImage(name);
              cache.set(name, saved);
              return saved;
            } catch (error) {
              console.warn("[Import CSV] Failed to persist image", {
                name,
                error,
              });
            }
          }
          cache.set(name, null);
          return null;
        };
      })();

      const cards = await buildManualCardsFromRows(
        parsed.data as any[],
        externalResolver
      );
      if (!cards.length) {
        setPopup({
          message: "Brak danych w pliku CSV",
          color: "angry",
          duration: 3000,
        });
        return;
      }
      replaceManualCards(cards);
      setPopup({
        message: `Zaimportowano ${cards.length} fiszek z pliku CSV`,
        color: "calm",
        duration: 3500,
      });
    } catch (e) {
      setPopup({
        message: "Błąd importu CSV",
        color: "angry",
        duration: 4000,
      });
      console.error("CSV import error", e);
    }
  };

  const readSampleCsv = async () => {
    const asset = Asset.fromModule(sampleCsvAsset);
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
            color: "calm",
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
        color: "calm",
        duration: 4000,
      });
    } catch (error) {
      console.error("Failed to export sample CSV", error);
      setPopup({
        message: "Nie udało się zapisać pliku",
        color: "angry",
        duration: 4000,
      });
    }
  };

  const handleSaveCourse = async () => {
    const cleanName = courseName.trim();
    if (!cleanName) {
      setPopup({
        message: "Najpierw nadaj nazwę kursowi",
        color: "angry",
        duration: 3000,
      });
      router.back();
      return;
    }
    if (!iconId) {
      setPopup({
        message: "Wybierz ikonę kursu",
        color: "angry",
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
          flipped: boolean;
          hintFront?: string | null;
          hintBack?: string | null;
          answerOnly?: boolean;
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
        flipped: card.flipped,
        hintFront: card.hintFront ?? "",
        hintBack: card.hintBack ?? "",
        answerOnly: card.answerOnly ?? false,
        imageFront: card.imageFront ?? null,
        imageBack: card.imageBack ?? null,
      });
      return acc;
    }, []);

    if (trimmedCards.length === 0) {
      setPopup({
        message: "Dodaj przynajmniej jedną fiszkę",
        color: "angry",
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

      console.log('Saving cards to database:', trimmedCards);
      await replaceCustomFlashcards(courseId, trimmedCards);

      setPopup({
        message: "Zestaw fiszek zapisany!",
        color: "calm",
        duration: 3500,
      });
      router.replace("/coursepanel");
    } catch (error) {
      console.error("Failed to save custom course", error);
      setPopup({
        message: "Nie udało się zapisać zestawu",
        color: "angry",
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
                Plik CSV powinien mieć kolumny: front (treść fiszki), back
                (odpowiedź), hint1 (podpowiedź do front), hint2 (podpowiedź do
                back), lock oraz answer_only (aliasy: question, pytanie).
                Podpowiedzi mogą zostać puste. W lock wpisz true/1/tak, jeśli
                fiszka ma być zablokowana. W answer_only wpisz true/1/tak, jeśli
                po błędzie użytkownik ma poprawiać tylko odpowiedź (bez
                przepisywania pytania). W polu back możesz podać kilka
                odpowiedzi, oddzielając je średnikiem lub kreską | (np. cat;
                kitty). Dodatkowe kolumny image_front / image_back możesz
                wykorzystać przy imporcie ZIP (pliki w folderze images/ obok
                data.csv). Możesz też pobrać gotowy szablon CSV do
                uzupełnienia na komputerze.
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
                onToggleFlipped={handleToggleFlipped}
                onCardImageChange={handleManualCardImageChange}
              />
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <View style={styles.buttonsRow}>
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
