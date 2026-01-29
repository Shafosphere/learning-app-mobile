import MyButton from "@/src/components/button/button";
import { DEFAULT_COURSE_COLOR } from "@/src/constants/customCourse";
import { usePopup } from "@/src/contexts/PopupContext";
import {
  createCustomCourse,
  replaceCustomFlashcards,
} from "@/src/db/sqlite/db";
import {
  createEmptyManualCard,
  ensureCardsNormalized,
  normalizeAnswers,
  useManualCardsForm,
  type ManualCard,
  type ManualCardType,
} from "@/src/hooks/useManualCardsForm";
import {
  ManualCardsEditor,
  ManualCardsEditorStyles,
} from "@/src/screens/courses/editcourse/components/editFlashcards/editFlashcards";
import { CardTypeSelector, CardTypeOption } from "@/src/screens/courses/makenewcourse/components/CardTypeSelector";
import { CsvImportGuide, CsvImportType } from "@/src/screens/courses/makenewcourse/components/CsvImportGuide";
import { importImageFromZip, saveImage } from "@/src/services/imageService";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import JSZip, { JSZipObject } from "jszip";
import Papa from "papaparse";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useStyles } from "./importFlashcards-styles";

type AddMode = "csv" | "manual";

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

const cardTypeOptions: { key: ManualCardType; label: string }[] = [
  {
    key: "text",
    label: "Tradycyjne",
  },
  {
    key: "image",
    label: "Z obrazkiem",
  },
  {
    key: "true_false",
    label: "Prawda / Fałsz",
  },
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
  const manualCardsByTypeRef = useRef<Record<ManualCardType, ManualCard[]>>({
    text: manualCards,
    image: [createEmptyManualCard("card-image-0", "image")],
    true_false: [createEmptyManualCard("card-truefalse-0", "true_false")],
  });
  const [manualCardType, setManualCardType] = useState<ManualCardType>("text");
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvCardType, setCsvCardType] = useState<CsvImportType>("text");
  const [isSaving, setIsSaving] = useState(false);
  const csvTypeOptions: CardTypeOption<CsvImportType>[] = [
    { key: "text", label: "Tradycyjne" },
    { key: "true_false", label: "Prawda / Fałsz" },
    { key: "image", label: "Z obrazkami (ZIP)" },
  ];

  const inferCardTypeFromCards = useCallback((cards: ManualCard[]): ManualCardType => {
    if (cards.length > 0 && cards.every((card) => (card.type ?? "text") === "true_false")) {
      return "true_false";
    }
    if (
      cards.some(
        (card) =>
          (card.type ?? "text") === "image" ||
          Boolean(card.imageFront) ||
          Boolean(card.imageBack)
      )
    ) {
      return "image";
    }
    return "text";
  }, []);

  const mapCardsToType = useCallback(
    (cards: ManualCard[], nextType: ManualCardType): ManualCard[] =>
      cards.map((card) => {
        if (nextType === "true_false") {
          const normalizedAnswer =
            card.answers[0]?.toLowerCase() === "false" ? "false" : "true";
          return {
            ...card,
            type: nextType,
            answers: [normalizedAnswer],
            imageFront: null,
            imageBack: null,
            front: card.front ?? "",
          };
        }
        const ensuredAnswers = card.answers.length > 0 ? card.answers : [""];
        return {
          ...card,
          type: nextType,
          answers: ensuredAnswers,
          front: nextType === "image" ? "" : card.front ?? "",
          imageFront: nextType === "image" ? card.imageFront ?? null : null,
          imageBack: nextType === "image" ? null : card.imageBack ?? null,
        };
      }),
    []
  );

  const persistCurrentManualCards = useCallback(() => {
    manualCardsByTypeRef.current[manualCardType] = ensureCardsNormalized(
      manualCards.map((card) => ({ ...card, type: manualCardType }))
    );
  }, [manualCardType, manualCards]);

  const loadCardsForType = useCallback(
    (nextType: ManualCardType, providedCards?: ManualCard[]) => {
      persistCurrentManualCards();
      const nextCards =
        providedCards ??
        manualCardsByTypeRef.current[nextType] ??
        [createEmptyManualCard(undefined, nextType)];
      const normalized = ensureCardsNormalized(
        nextCards.map((card) => ({ ...card, type: nextType }))
      );
      manualCardsByTypeRef.current[nextType] = normalized;
      setManualCardType(nextType);
      replaceManualCards(normalized);
    },
    [persistCurrentManualCards, replaceManualCards]
  );

  const handleManualCardTypeChange = useCallback(
    (nextType: ManualCardType) => {
      if (nextType === manualCardType) return;
      loadCardsForType(nextType);
    },
    [loadCardsForType, manualCardType]
  );

  const parseBooleanValue = (value: unknown): boolean => {
    if (value == null) return false;
    const normalized = value.toString().trim().toLowerCase();
    return TRUE_VALUES.has(normalized);
  };
  const isBooleanText = (value: string): boolean => {
    const normalized = value.toLowerCase();
    return (
      TRUE_VALUES.has(normalized) ||
      normalized === "false" ||
      normalized === "no" ||
      normalized === "nie" ||
      normalized === "n" ||
      normalized === "unlocked" ||
      value === "0"
    );
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
    const readStringField = (row: any, keys: string[]): string => {
      for (const key of keys) {
        const raw = row[key];
        if (raw != null && `${raw}`.toString().trim().length > 0) {
          return `${raw}`.toString();
        }
      }
      return "";
    };

    const readBooleanishField = (row: any, keys: string[]): any => {
      for (const key of keys) {
        const raw = row[key];
        if (raw != null && `${raw}`.toString().trim().length > 0) {
          return raw;
        }
      }
      return null;
    };

    const cards: ManualCard[] = [];
    for (let idx = 0; idx < rows.length; idx += 1) {
      const row = rows[idx];
      const trueFalseRaw = readBooleanishField(row, [
        "is_true",
        "isTrue",
        "czy_prawda",
        "czyPrawda",
        "prawda",
        "prawda_falsz",
        "prawdaFalsz",
      ]);
      const hasTrueFalseFlag =
        trueFalseRaw != null &&
        trueFalseRaw.toString().trim().length > 0;
      const backRaw = readStringField(row, ["back", "tyl"]);
      const answers = hasTrueFalseFlag
        ? [parseBooleanValue(trueFalseRaw) ? "true" : "false"]
        : parseAnswers(backRaw);
      const isBoolean = hasTrueFalseFlag
        ? true
        : answers.length > 0 && answers.every((a) => isBooleanText(a));

      const answerOnly = parseBooleanValue(
        readBooleanishField(row, [
          "blokada",
          "block",
          "answer_only",
          "question",
          "pytanie",
          "lock",
        ])
      );
      const imageFrontName = normalizeImageField(
        readStringField(row, ["image_front", "imageFront", "obraz_przod"])
      );
      const imageBackName = normalizeImageField(
        readStringField(row, ["image_back", "imageBack", "obraz_tyl"])
      );
      const imageFront = resolveImage ? await resolveImage(imageFrontName) : null;
      const imageBack = resolveImage ? await resolveImage(imageBackName) : null;
      const hasImages = Boolean(imageFront || imageBack);
      const type: ManualCardType = isBoolean
        ? "true_false"
        : hasImages
          ? "image"
          : "text";

      const card: ManualCard = {
        id: `csv-${idx}`,
        front: readStringField(row, ["front", "przod"]),
        answers: answers.length > 0 ? answers : [backRaw],
        flipped: !answerOnly,
        answerOnly,
        hintFront: readStringField(row, ["hint1", "hint_front", "podpowiedz1"]),
        hintBack: readStringField(row, ["hint2", "hint_back", "podpowiedz2"]),
        imageFront,
        imageBack,
        type,
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

  const handleZipImport = async (fileUri: string) => {
    try {
      const zipBase64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const zip = await JSZip.loadAsync(zipBase64, { base64: true });
      const csvFile = zip.file("data.csv");
      const csvEntry = csvFile || zip.file(/\.csv$/i)?.[0];
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
          if (match) {
            entry = match;
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

      const inferredType = inferCardTypeFromCards(cards);
      loadCardsForType(inferredType, mapCardsToType(cards, inferredType));
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
        await handleZipImport(fileUri);
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
      const inferredType = inferCardTypeFromCards(cards);
      loadCardsForType(inferredType, mapCardsToType(cards, inferredType));
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
        imageFront?: string | null;
        imageBack?: string | null;
        type?: "text" | "image" | "true_false";
      }[]
    >((acc, card) => {
      const frontText = card.front.trim();
      const answers = normalizeAnswers(card.answers);
      const hasFrontImage = (card.imageFront ?? "").toString().length > 0;
      if (!frontText && answers.length === 0 && !hasFrontImage) {
        return acc;
      }
      const backText = answers[0] ?? "";
      const cardTypeToSave = (card.type ?? manualCardType) as ManualCardType;
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
        type: cardTypeToSave,
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
              <CardTypeSelector
                options={csvTypeOptions}
                value={csvCardType}
                onChange={setCsvCardType}
                label="Typ fiszek"
              />
              <CsvImportGuide
                onPickFile={handleSelectCsv}
                selectedFileName={csvFileName}
                activeType={csvCardType}
              />
            </View>
          ) : (
            <View style={styles.modeContainer}>
              <CardTypeSelector
                options={cardTypeOptions}
                value={manualCardType}
                onChange={handleManualCardTypeChange}
                label="Typ fiszek"
              />
              <Text style={styles.miniSectionHeader}>fiszki</Text>
              <ManualCardsEditor
                manualCards={manualCards}
                cardType={manualCardType}
                styles={styles as unknown as ManualCardsEditorStyles}
                onCardFrontChange={handleManualCardFrontChange}
                onCardAnswerChange={handleManualCardAnswerChange}
                onAddAnswer={handleAddAnswer}
                onRemoveAnswer={handleRemoveAnswer}
                onAddCard={() => handleAddCard(manualCardType)}
                onRemoveCard={handleRemoveCard}
                onToggleFlipped={handleToggleFlipped}
                onCardImageChange={
                  manualCardType === "image"
                    ? handleManualCardImageChange
                    : undefined
                }
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
