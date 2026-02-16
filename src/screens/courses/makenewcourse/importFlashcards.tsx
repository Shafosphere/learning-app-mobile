import MyButton from "@/src/components/button/button";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePopup } from "@/src/contexts/PopupContext";
import {
  createEmptyManualCard,
  normalizeAnswers,
  useManualCardsForm,
  type ManualCardType,
} from "@/src/hooks/useManualCardsForm";
import {
  ManualCardsEditor,
  ManualCardsEditorStyles,
} from "@/src/screens/courses/editcourse/components/editFlashcards/editFlashcards";
import { CardTypeSelector } from "@/src/screens/courses/makenewcourse/components/CardTypeSelector";
import { CsvImportGuide } from "@/src/screens/courses/makenewcourse/components/CsvImportGuide";
import {
  analyzeRows,
} from "@/src/screens/courses/makenewcourse/csvImport/analyzeRows";
import { mapAnalysisToManualCards } from "@/src/screens/courses/makenewcourse/csvImport/mapToManualCards";
import { parseImportFile } from "@/src/screens/courses/makenewcourse/csvImport/parseFile";
import type { CsvAnalysisResult } from "@/src/screens/courses/makenewcourse/csvImport/types";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import {
  CONTENT_DRAFT_STORAGE_KEY,
  type AddMode,
  type ContentDraftPayload,
  isAddMode,
  isManualCardType,
  makeCustomCourseDraftScopeKey,
  normalizeDraftCards,
} from "./contentDraft";
import { useStyles } from "./importFlashcards-styles";

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

type CsvStep = "idle" | "analyzing" | "preview" | "importing";

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
    handleManualCardExplanationChange,
  } = useManualCardsForm({
    initialCards: [createEmptyManualCard("card-0")],
  });
  const [newCardType, setNewCardType] = useState<ManualCardType>("text");
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvStep, setCsvStep] = useState<CsvStep>("idle");
  const [csvAnalysis, setCsvAnalysis] = useState<CsvAnalysisResult | null>(null);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);

  const shouldShowManualToolbar = addMode === "manual";

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
        csvFileName,
        manualCards,
      };
      void AsyncStorage.setItem(
        CONTENT_DRAFT_STORAGE_KEY,
        JSON.stringify(payload)
      );
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [addMode, newCardType, csvFileName, manualCards, draftScopeKey, isDraftHydrated]);

  const handlePickCsvFile = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "text/plain",
          "application/zip",
          "application/x-zip-compressed",
          "*/*",
        ],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) {
        return;
      }

      const asset = picked.assets[0];
      const fileName = asset.name ?? "plik";
      setCsvFileName(fileName);
      setCsvStep("analyzing");

      const parsed = await parseImportFile({
        uri: asset.uri,
        name: asset.name,
      });
      const analysis = analyzeRows(parsed);
      setCsvAnalysis(analysis);
      setCsvStep("preview");

      const errorCount = analysis.issues.filter((issue) => issue.severity === "error").length;
      const warningCount = analysis.issues.filter((issue) => issue.severity === "warning").length;

      if (analysis.validRows.length === 0) {
        setPopup({
          message: "Nie ma jeszcze wierszy, ktore da sie zaimportowac.",
          color: "angry",
          duration: 3500,
        });
        return;
      }

      setPopup({
        message:
          errorCount > 0
            ? `Sprawdzono plik: ${analysis.validRows.length} da sie zaimportowac, ${errorCount} trzeba poprawic.`
            : warningCount > 0
              ? `Sprawdzono plik: ${analysis.validRows.length} da sie zaimportowac, ${warningCount} ma ostrzezenia.`
              : `Super! ${analysis.validRows.length} wierszy jest gotowych do importu.`,
        color: warningCount > 0 || errorCount > 0 ? "disoriented" : "calm",
        duration: 3500,
      });
    } catch (error) {
      console.error("CSV parse/analyze error", error);
      setCsvStep("idle");
      setPopup({
        message: "Błąd analizy pliku CSV/ZIP.",
        color: "angry",
        duration: 4000,
      });
    }
  };

  const handleImportAnalyzedRows = async () => {
    if (!csvAnalysis) return;
    try {
      setCsvStep("importing");
      const cards = await mapAnalysisToManualCards(csvAnalysis);

      if (!cards.length) {
        setPopup({
          message: "Nie ma kart, ktore da sie teraz zaimportowac.",
          color: "angry",
          duration: 3500,
        });
        setCsvStep("preview");
        return;
      }

      replaceManualCards(cards);
      setAddMode("manual");

      const skipped = csvAnalysis.invalidRowsCount;
      const warningCount = csvAnalysis.issues.filter(
        (issue) => issue.severity === "warning"
      ).length;

      setPopup({
        message:
          skipped > 0
            ? `Zaimportowano ${cards.length} fiszek, pominięto ${skipped} błędnych wierszy.`
            : warningCount > 0
              ? `Zaimportowano ${cards.length} fiszek (${warningCount} ostrzeżeń).`
              : `Zaimportowano ${cards.length} fiszek.`,
        color: skipped > 0 ? "disoriented" : "calm",
        duration: 4000,
      });
      setCsvStep("preview");
    } catch (error) {
      console.error("CSV import error", error);
      setPopup({
        message: "Błąd podczas importu fiszek.",
        color: "angry",
        duration: 4000,
      });
      setCsvStep("preview");
    }
  };

  const handleResetCsvPreview = () => {
    setCsvAnalysis(null);
    setCsvStep("idle");
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

    const paramsToPass: Record<string, string> = {
      name: cleanName,
      iconId,
      iconColor,
      reviewsEnabled: reviewsEnabled ? "1" : "0",
    };
    if (colorId) {
      paramsToPass.colorId = colorId;
    }

    const latestDraftPayload: ContentDraftPayload = {
      scopeKey: draftScopeKey,
      addMode,
      newCardType,
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
    router.push({ pathname: settingsPath, params: paramsToPass });
  };

  const handleGoBack = () => {
    router.back();
  };

  const csvErrorCount = csvAnalysis
    ? csvAnalysis.issues.filter((issue) => issue.severity === "error").length
    : 0;
  const csvWarningCount = csvAnalysis
    ? csvAnalysis.issues.filter((issue) => issue.severity === "warning").length
    : 0;

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <View
          style={[
            styles.section,
            shouldShowManualToolbar && styles.sectionWithManualToolbar,
          ]}
        >
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
              <CsvImportGuide
                onPickFile={handlePickCsvFile}
                selectedFileName={csvFileName}
                isAnalyzing={csvStep === "analyzing"}
              />

              {csvAnalysis ? (
                <View style={styles.csvPreviewCard}>
                  <Text style={styles.csvPreviewTitle}>Podgląd importu</Text>

                  <View style={styles.csvStatsGrid}>
                    <View style={styles.csvStatBox}>
                      <Text style={styles.csvStatLabel}>Wiersze</Text>
                      <Text style={styles.csvStatValue}>{csvAnalysis.totalRows}</Text>
                    </View>
                    <View style={styles.csvStatBox}>
                      <Text style={styles.csvStatLabel}>Da sie zaimportowac</Text>
                      <Text style={styles.csvStatValue}>{csvAnalysis.validRows.length}</Text>
                    </View>
                    <View style={styles.csvStatBox}>
                      <Text style={styles.csvStatLabel}>Bledy do poprawy</Text>
                      <Text style={styles.csvStatValue}>{csvErrorCount}</Text>
                    </View>
                    <View style={styles.csvStatBox}>
                      <Text style={styles.csvStatLabel}>Ostrzezenia</Text>
                      <Text style={styles.csvStatValue}>{csvWarningCount}</Text>
                    </View>
                  </View>

                  <View style={styles.csvTypeStatsRow}>
                    <Text style={styles.csvTypePill}>
                      Traditional: {csvAnalysis.statsByType.traditional}
                    </Text>
                    <Text style={styles.csvTypePill}>
                      True/False: {csvAnalysis.statsByType.true_false}
                    </Text>
                    <Text style={styles.csvTypePill}>
                      Self-assess: {csvAnalysis.statsByType.self_assess}
                    </Text>
                  </View>

                  {csvAnalysis.issues.length > 0 ? (
                    <View style={styles.csvIssuesBox}>
                      {csvAnalysis.issues.slice(0, 12).map((issue, index) => (
                        <Text
                          key={`${issue.code}-${issue.row ?? "x"}-${index}`}
                          style={styles.csvIssueText}
                        >
                          [{issue.severity.toUpperCase()}]
                          {issue.row ? ` wiersz ${issue.row}` : ""}
                          {issue.field ? ` (${issue.field})` : ""}: {issue.message}
                        </Text>
                      ))}
                      {csvAnalysis.issues.length > 12 ? (
                        <Text style={styles.csvIssueTextMuted}>
                          +{csvAnalysis.issues.length - 12} kolejnych wpisów w raporcie.
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={styles.csvActionRow}>
                    <MyButton
                      text={csvStep === "importing" ? "Importowanie..." : "Importuj poprawne"}
                      color="my_green"
                      width={190}
                      disabled={csvStep === "importing" || csvAnalysis.validRows.length === 0}
                      onPress={handleImportAnalyzedRows}
                    />
                    <MyButton
                      text="Wyczyść raport"
                      color="my_yellow"
                      width={150}
                      disabled={csvStep === "importing"}
                      onPress={handleResetCsvPreview}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.modeContainer}>
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
                onCardExplanationChange={handleManualCardExplanationChange}
                showDefaultBottomAddButton={false}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {shouldShowManualToolbar ? (
        <Animated.View
          style={styles.manualToolbarWrap}
        >
          <View style={styles.manualToolbar}>
            <CardTypeSelector
              options={cardTypeOptions}
              value={newCardType}
              onChange={setNewCardType}
              label="Typ fiszki"
              labelHidden
              size="compact"
              dropdownDirection="up"
              containerStyle={styles.manualTypeSelector}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dodaj nową fiszkę"
              style={styles.manualAddButton}
              hitSlop={8}
              onPress={() => handleAddCard(newCardType)}
            >
              <Text style={styles.manualAddIcon}>+</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

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
