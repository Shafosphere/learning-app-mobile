import MyButton from "@/src/components/button/button";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePopup } from "@/src/contexts/PopupContext";
import {
  createEmptyManualCard,
  normalizeAnswers,
  useManualCardsForm,
  type ManualCard,
  type ManualCardType,
} from "@/src/hooks/useManualCardsForm";
import {
  ManualCardsEditor,
  ManualCardsEditorStyles,
} from "@/src/screens/courses/editcourse/components/editFlashcards/editFlashcards";
import { CardTypeOption, CardTypeSelector } from "@/src/screens/courses/makenewcourse/components/CardTypeSelector";
import { CsvImportGuide, CsvImportType } from "@/src/screens/courses/makenewcourse/components/CsvImportGuide";
import { importImageFromZip, saveImage } from "@/src/services/imageService";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import JSZip, { JSZipObject } from "jszip";
import Papa from "papaparse";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  CONTENT_DRAFT_STORAGE_KEY,
  type AddMode,
  type ContentDraftPayload,
  isAddMode,
  isCsvImportType,
  isManualCardType,
  makeCustomCourseDraftScopeKey,
  normalizeDraftCards,
} from "./contentDraft";
import { useStyles } from "./importFlashcards-styles";

const TRUE_VALUES = new Set([
  "true",
  "1",
  "yes",
  "y",
  "tak",
  "t",
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
    key: "true_false",
    label: "Prawda / Fałsz",
  },
  {
    key: "know_dont_know",
    label: "Umiem / Nie umiem",
  },
];

export default function CustomCourseContentScreen() {
  const styles = useStyles();
  const setPopup = usePopup();
  const router = useRouter();
  const pathname = usePathname();
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
  const [newCardType, setNewCardType] = useState<ManualCardType>("text");
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvCardType, setCsvCardType] = useState<CsvImportType>("text");
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const csvTypeOptions: CardTypeOption<CsvImportType>[] = [
    { key: "text", label: "Tradycyjne" },
    { key: "true_false", label: "Prawda / Fałsz" },
    { key: "know_dont_know", label: "Umiem / Nie umiem" },
  ];
  const draftScopeKey = useMemo(
    () =>
      makeCustomCourseDraftScopeKey({
        courseName,
        iconId,
        iconColor,
        colorId,
        reviewsEnabled,
      }),
    [courseName, colorId, iconColor, iconId, reviewsEnabled]
  );

  useEffect(() => {
    let isMounted = true;
    const restoreDraft = async () => {
      try {
        const raw = await AsyncStorage.getItem(CONTENT_DRAFT_STORAGE_KEY);
        if (!raw || !isMounted) return;
        const parsed = JSON.parse(raw) as Partial<ContentDraftPayload>;
        if (!parsed || parsed.scopeKey !== draftScopeKey) return;

        if (isAddMode(parsed.addMode)) {
          setAddMode(parsed.addMode);
        }
        if (isManualCardType(parsed.newCardType)) {
          setNewCardType(parsed.newCardType);
        }
        if (isCsvImportType(parsed.csvCardType)) {
          setCsvCardType(parsed.csvCardType);
        }
        if (parsed.csvFileName === null || typeof parsed.csvFileName === "string") {
          setCsvFileName(parsed.csvFileName);
        }

        const restoredCards = normalizeDraftCards(parsed.manualCards);
        if (restoredCards.length > 0) {
          replaceManualCards(restoredCards);
        }
      } catch (error) {
        console.warn("Failed to restore content draft", error);
      } finally {
        if (isMounted) {
          setIsDraftHydrated(true);
        }
      }
    };

    void restoreDraft();
    return () => {
      isMounted = false;
    };
  }, [draftScopeKey, replaceManualCards]);

  useEffect(() => {
    if (!isDraftHydrated) return;
    const timeoutId = setTimeout(() => {
      const payload: ContentDraftPayload = {
        scopeKey: draftScopeKey,
        addMode,
        newCardType,
        csvCardType,
        csvFileName,
        manualCards,
      };
      void AsyncStorage.setItem(
        CONTENT_DRAFT_STORAGE_KEY,
        JSON.stringify(payload)
      );
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [
    addMode,
    newCardType,
    csvCardType,
    csvFileName,
    manualCards,
    draftScopeKey,
    isDraftHydrated,
  ]);

  const parseBooleanValue = (value: unknown): boolean => {
    if (value == null) return false;
    const normalized = value.toString().trim().toLowerCase();
    return TRUE_VALUES.has(normalized);
  };
  const isBooleanText = (value: string): boolean => {
    // Accept only unambiguous boolean words; ignore 1-letter tokens like "t" so regular answers stay text cards.
    const normalized = value.trim().toLowerCase();
    return (
      normalized === "true" ||
      normalized === "false" ||
      normalized === "yes" ||
      normalized === "no" ||
      normalized === "tak" ||
      normalized === "nie"
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
    resolveImage?: (name: string | null) => Promise<string | null>,
    fallbackType: ManualCardType = "text"
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

      const readCardType = (row: any): ManualCardType | null => {
      const raw = row?.type;
      if (raw == null) return null;
      const normalized = raw.toString().trim().toLowerCase();
      if (
        normalized === "text" ||
        normalized === "true_false" ||
        normalized === "know_dont_know"
      ) {
        return normalized as ManualCardType;
      }
      if (normalized === "image") {
        return "text";
      }
      return null;
    };

    const cards: ManualCard[] = [];
    for (let idx = 0; idx < rows.length; idx += 1) {
      const row = rows[idx];
      const explicitType = readCardType(row);
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
      const imageFrontName = normalizeImageField(
        readStringField(row, ["image_front", "imageFront", "obraz_przod"])
      );
      const imageFront = resolveImage ? await resolveImage(imageFrontName) : null;
      const imageBack = null;

      const inferredAnswers = hasTrueFalseFlag
        ? [parseBooleanValue(trueFalseRaw) ? "true" : "false"]
        : parseAnswers(backRaw);
      const isBoolean = hasTrueFalseFlag
        ? true
        : inferredAnswers.length > 0 && inferredAnswers.every((a) => isBooleanText(a));
      const inferredType: ManualCardType = isBoolean ? "true_false" : "text";
      const type: ManualCardType =
        explicitType ?? (fallbackType !== "text" ? fallbackType : inferredType);

      const flipFlag = parseBooleanValue(
        readBooleanishField(row, ["flip"])
      );
      const explanation = readStringField(row, [
        "explanation",
        "wyjasnienie",
        "wyjaśnienie",
        "opis",
      ]);

      const card: ManualCard = {
        id: `csv-${idx}`,
        front: readStringField(row, ["front", "przod"]),
        answers: [],
        flipped: flipFlag,
        answerOnly: false,
        hintFront: readStringField(row, ["hint1", "hint_front", "podpowiedz1"]),
        hintBack: readStringField(row, ["hint2", "hint_back", "podpowiedz2"]),
        imageFront,
        imageBack,
        explanation: explanation || null,
        type,
      };

      if (type === "know_dont_know") {
        const fallbackExplanation = backRaw || explanation;
        card.explanation = fallbackExplanation || null;
        card.answers = [];
        card.answerOnly = true;
        card.flipped = false;
      } else if (type === "true_false") {
        const answers = hasTrueFalseFlag
          ? [parseBooleanValue(trueFalseRaw) ? "true" : "false"]
          : inferredAnswers.length > 0
            ? inferredAnswers.map((value) =>
                parseBooleanValue(value) ? "true" : "false"
              )
            : [];
        card.answers = answers.length > 0 ? answers : [backRaw];
      } else {
        const answers = inferredAnswers.length > 0 ? inferredAnswers : [backRaw];
        card.answers = answers;
      }

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
        resolveZipImage,
        csvCardType
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
        externalResolver,
        csvCardType
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


  const handleNavigateToSettings = async () => {
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
        explanation?: string | null;
        type?: "text" | "true_false" | "know_dont_know";
      }[]
    >((acc, card) => {
      const frontText = card.front.trim();
      const answers = normalizeAnswers(card.answers);
      const hasFrontImage = (card.imageFront ?? "").toString().length > 0;
      if (!frontText && answers.length === 0 && !hasFrontImage) {
        return acc;
      }
      const backText = answers[0] ?? "";
      const cardTypeToSave = (card.type ?? "text") as ManualCardType;
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
        explanation: card.explanation ?? null,
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

    const params: Record<string, string> = {
      name: cleanName,
      iconId,
      iconColor,
      reviewsEnabled: reviewsEnabled ? "1" : "0",
    };
    if (colorId) {
      params.colorId = colorId;
    }

    // Flush latest draft immediately before navigating to step 3.
    // Debounced autosave can miss the last keystrokes if user clicks "Dalej" quickly.
    const latestDraftPayload: ContentDraftPayload = {
      scopeKey: draftScopeKey,
      addMode,
      newCardType,
      csvCardType,
      csvFileName,
      manualCards,
    };
    try {
      if (__DEV__) {
        console.log("[ContentStep] Flushing draft before navigation", {
          scopeKey: draftScopeKey,
          cards: manualCards.length,
          addMode,
          newCardType,
          csvCardType,
          csvFileName,
        });
      }
      await AsyncStorage.setItem(
        CONTENT_DRAFT_STORAGE_KEY,
        JSON.stringify(latestDraftPayload)
      );
    } catch (error) {
      console.warn("Failed to persist content draft before navigation", error);
    }

    const settingsPath = pathname.startsWith("/custom_profile")
      ? "/custom_profile/settings"
      : "/custom_course/settings";
    router.push({ pathname: settingsPath, params });
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
                label="Typ fiszki"
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
                value={newCardType}
                onChange={setNewCardType}
                label="Typ fiszki"
              />
              <Text style={styles.miniSectionHeader}>fiszki</Text>
              <ManualCardsEditor
                manualCards={manualCards}
                cardType={newCardType}
                styles={styles as unknown as ManualCardsEditorStyles}
                onCardFrontChange={handleManualCardFrontChange}
                onCardAnswerChange={handleManualCardAnswerChange}
                onAddAnswer={handleAddAnswer}
                onRemoveAnswer={handleRemoveAnswer}
                onAddCard={() => handleAddCard(newCardType)}
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
            text="Dalej"
            color="my_green"
            onPress={handleNavigateToSettings}
            accessibilityLabel="Przejdź do ustawień kursu"
          />
        </View>
      </View>
    </View>
  );
}
