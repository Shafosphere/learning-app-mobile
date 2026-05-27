import MyButton from "@/src/components/button/button";
import { SegmentedTabs } from "@/src/components/segmentedTabs/SegmentedTabs";
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
} from "@/src/components/courseEditor/editFlashcards/editFlashcards";
import { CardTypeSelector } from "@/src/components/courseEditor/CardTypeSelector";
import { CsvImportGuide } from "@/src/components/courseEditor/CsvImportGuide";
import {
  analyzeRows,
} from "@/src/features/customCourse/csvImport/analyzeRows";
import { mapAnalysisToManualCards } from "@/src/features/customCourse/csvImport/mapToManualCards";
import { parseImportFile } from "@/src/features/customCourse/csvImport/parseFile";
import { deleteImage } from "@/src/services/imageService";
import {
  getCsvTemplate,
  type CsvTemplateKey,
} from "@/src/features/customCourse/csvImport/templates";
import { getCsvFieldLabel } from "@/src/features/customCourse/csvImport/schema";
import type { CsvAnalysisResult } from "@/src/features/customCourse/csvImport/types";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import * as Sharing from "expo-sharing";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  CONTENT_DRAFT_STORAGE_KEY,
  type AddMode,
  type ContentDraftPayload,
  isAddMode,
  isManualCardType,
  makeCustomCourseDraftScopeKey,
  normalizeDraftCards,
} from "@/src/features/customCourse/contentDraft";
import { useStyles } from "./ImportFlashcardsScreen-styles";

type CsvStep = "idle" | "analyzing" | "importing";

type LastSuccessfulImport = {
  previousCards: ManualCard[];
  previousFileName: string | null;
  previousImport: LastSuccessfulImport | null;
  createdImageUris: string[];
  cardsCount: number;
  errorCount: number;
};

type PendingImport = {
  analysis: CsvAnalysisResult;
  fileName: string;
  errorCount: number;
  warningCount: number;
};

const cloneManualCards = (cards: ManualCard[]): ManualCard[] =>
  cards.map((card) => ({ ...card, answers: [...card.answers] }));

const getCardImageUris = (cards: ManualCard[]): Set<string> => {
  const uris = new Set<string>();
  for (const card of cards) {
    if (card.imageFront) uris.add(card.imageFront);
    if (card.imageBack) uris.add(card.imageBack);
  }
  return uris;
};

const getNonEmptyManualCards = (cards: ManualCard[]): ManualCard[] =>
  cards.filter((card) => {
    const hasFrontText = card.front.trim().length > 0;
    const hasAnswers = normalizeAnswers(card.answers).length > 0;
    const hasFrontImage = Boolean(card.imageFront);
    return hasFrontText || hasAnswers || hasFrontImage;
  });

export default function CustomCourseContentScreen() {
  const styles = useStyles();
  const setPopup = usePopup();
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const { t, i18n } = useTranslation();
  const locale: "pl" | "en" = i18n.resolvedLanguage?.startsWith("en") ? "en" : "pl";

  const segmentOptions: { key: AddMode; label: string }[] = [
    { key: "csv", label: t("courseCreator.import.addModeCsv") },
    { key: "manual", label: t("courseCreator.import.addModeManual") },
  ];

  const cardTypeOptions: { key: ManualCardType; label: string }[] = [
    {
      key: "text",
      label: t("courseCreator.import.cardTypes.text"),
    },
    {
      key: "true_false",
      label: t("courseCreator.import.cardTypes.trueFalse"),
    },
    {
      key: "know_dont_know",
      label: t("repeats.cardTypes.knowDontKnow"),
    },
  ];

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
  const [lastSuccessfulImport, setLastSuccessfulImport] =
    useState<LastSuccessfulImport | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [downloadingTemplateKey, setDownloadingTemplateKey] =
    useState<CsvTemplateKey | null>(null);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const importActionInFlightRef = useRef(false);
  const isScreenMountedRef = useRef(true);

  const shouldShowManualToolbar = addMode === "manual";
  const isImportBusy = csvStep === "analyzing" || csvStep === "importing";

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
    isScreenMountedRef.current = true;
    return () => {
      isScreenMountedRef.current = false;
    };
  }, []);

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

  const handlePickImportFile = async (type: string[]) => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type,
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) {
        return;
      }

      const asset = picked.assets[0];
      const fileName = asset.name ?? t("courseCreator.import.defaultFileName");
      setPendingImport(null);
      setCsvStep("analyzing");

      const parsed = await parseImportFile({
        uri: asset.uri,
        name: asset.name,
        locale,
      });
      const analysis = analyzeRows(parsed, { locale });
      const errorCount = analysis.issues.filter((issue) => issue.severity === "error").length;
      const warningCount = analysis.issues.filter(
        (issue) => issue.severity === "warning"
      ).length;

      if (analysis.validRows.length === 0) {
        setPendingImport(null);
        setCsvStep("idle");
        setPopup({
          message: t("courseCreator.import.popups.noRows"),
          color: "angry",
          duration: 3500,
        });
        return;
      }

      if (errorCount > 0 || warningCount > 0) {
        setPendingImport({ analysis, fileName, errorCount, warningCount });
        setCsvStep("idle");
        setPopup({
          message:
            errorCount > 0
              ? t("courseCreator.import.popups.analyzedWithErrors", {
                  validRows: analysis.validRows.length,
                  errorCount,
                })
              : t("courseCreator.import.popups.analyzedWithWarnings", {
                  validRows: analysis.validRows.length,
                  warningCount,
                }),
          color: "disoriented",
          duration: 3500,
        });
        return;
      }

      await applyImportAnalysis({ analysis, fileName, errorCount, warningCount });
    } catch (error) {
      console.error("File parse/analyze error", error);
      setCsvStep("idle");
      setPopup({
        message: t("courseCreator.import.popups.analysisError"),
        color: "angry",
        duration: 4000,
      });
    } finally {
      if (isScreenMountedRef.current) {
        setCsvStep("idle");
      }
    }
  };

  const handlePickFile = async () => {
    if (isImportBusy || importActionInFlightRef.current) {
      return;
    }

    await handlePickImportFile([
      "text/csv",
      "text/plain",
      "application/zip",
      "application/x-zip-compressed",
      "*/*",
    ]);
  };

  const handleDownloadTemplate = async (templateKey: CsvTemplateKey) => {
    setDownloadingTemplateKey(templateKey);
    const template = getCsvTemplate(templateKey, { locale });

    try {
      if (Platform.OS === "web") {
        const web = globalThis as {
          document?: {
            createElement: (tagName: string) => {
              href: string;
              download: string;
              click: () => void;
              remove: () => void;
              style?: { display?: string };
            };
            body?: { appendChild: (node: unknown) => void };
          };
          URL?: {
            createObjectURL: (obj: Blob) => string;
            revokeObjectURL: (url: string) => void;
          };
          Blob?: typeof Blob;
        };

        if (!web.document || !web.URL || !web.Blob) {
          throw new Error("Web download API unavailable");
        }

        const blob = new web.Blob([template.content], {
          type: "text/csv;charset=utf-8;",
        });
        const url = web.URL.createObjectURL(blob);
        const anchor = web.document.createElement("a");
        anchor.href = url;
        anchor.download = template.fileName;
        web.document.body?.appendChild(anchor);
        anchor.click();
        anchor.remove();
        web.URL.revokeObjectURL(url);

        setPopup({
          message: t("courseCreator.import.popups.templateDownloaded", {
            fileName: template.fileName,
          }),
          color: "calm",
          duration: 2500,
        });
        return;
      }

      if (Platform.OS === "android") {
        const permissions =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions.granted) {
          setPopup({
            message: t("courseCreator.import.popups.templateDirectoryMissing"),
            color: "disoriented",
            duration: 3200,
          });
          return;
        }

        const targetUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          template.fileName,
          "text/csv"
        );

        await FileSystem.writeAsStringAsync(targetUri, template.content, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        setPopup({
          message: t("courseCreator.import.popups.templateSaved", {
            fileName: template.fileName,
          }),
          color: "calm",
          duration: 3000,
        });
        return;
      }

      const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!baseDir) {
        throw new Error("Missing local directory for template");
      }
      const fileUri = `${baseDir}${template.fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, template.content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const sharingAvailable = await Sharing.isAvailableAsync().catch(
        () => false
      );
      if (!sharingAvailable) {
        setPopup({
          message: t("courseCreator.import.popups.templateSavedLocally", {
            fileName: template.fileName,
          }),
          color: "calm",
          duration: 3000,
        });
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        UTI: "public.comma-separated-values-text",
        dialogTitle: t("courseCreator.import.shareDialogTitle"),
      });

      setPopup({
        message: t("courseCreator.import.popups.templateReady", {
          fileName: template.fileName,
        }),
        color: "calm",
        duration: 2500,
      });
    } catch (error) {
      console.error("CSV template download error", error);
      setPopup({
        message: t("courseCreator.import.popups.templateDownloadError"),
        color: "angry",
        duration: 3500,
      });
    } finally {
      setDownloadingTemplateKey(null);
    }
  };

  const mapCsvAnalysisOrPopup = async (
    analysis: CsvAnalysisResult
  ): Promise<ManualCard[] | null> => {
    try {
      const cards = await mapAnalysisToManualCards(analysis);
      if (!cards.length) {
        if (isScreenMountedRef.current) {
          setPopup({
            message: t("courseCreator.import.popups.noCardsToImport"),
            color: "angry",
            duration: 3500,
          });
        }
        return null;
      }
      return cards;
    } catch (error) {
      console.error("CSV import error", error);
      if (isScreenMountedRef.current) {
        setPopup({
          message: t("courseCreator.import.popups.importError"),
          color: "angry",
          duration: 4000,
        });
      }
      return null;
    }
  };

  const applyImportAnalysis = async ({
    analysis,
    fileName,
    errorCount,
  }: PendingImport): Promise<boolean> => {
    setCsvStep("importing");
    const cards = await mapCsvAnalysisOrPopup(analysis);
    if (!cards || !isScreenMountedRef.current) {
      return false;
    }

    const warningCount = analysis.issues.filter(
      (issue) => issue.severity === "warning"
    ).length;
    setLastSuccessfulImport({
      previousCards: cloneManualCards(manualCards),
      previousFileName: csvFileName,
      previousImport: lastSuccessfulImport,
      createdImageUris: analysis.getCreatedImageUris?.() ?? [],
      cardsCount: cards.length,
      errorCount,
    });
    setPendingImport(null);
    replaceManualCards(cards);
    setCsvFileName(fileName);
    setAddMode("manual");
    setCsvStep("idle");

    setPopup({
      message:
        analysis.invalidRowsCount > 0
          ? t("courseCreator.import.popups.importedWithSkipped", {
              cardsCount: cards.length,
              skipped: analysis.invalidRowsCount,
            })
          : warningCount > 0
            ? t("courseCreator.import.popups.importedWithWarnings", {
                cardsCount: cards.length,
                warningCount,
              })
            : t("courseCreator.import.popups.importedSuccess", {
                cardsCount: cards.length,
              }),
      color: analysis.invalidRowsCount > 0 ? "disoriented" : "calm",
      duration: 4000,
    });
    return true;
  };

  const handleImportPendingRows = async () => {
    if (!pendingImport || isImportBusy || importActionInFlightRef.current) {
      return;
    }

    importActionInFlightRef.current = true;
    try {
      await applyImportAnalysis(pendingImport);
    } finally {
      importActionInFlightRef.current = false;
      if (isScreenMountedRef.current) {
        setCsvStep("idle");
      }
    }
  };

  const handleUndoImport = async () => {
    if (!lastSuccessfulImport || isImportBusy || importActionInFlightRef.current) {
      return;
    }

    importActionInFlightRef.current = true;
    const importToUndo = lastSuccessfulImport;
    const retainedImageUris = getCardImageUris(importToUndo.previousCards);

    replaceManualCards(importToUndo.previousCards);
    setLastSuccessfulImport(importToUndo.previousImport);
    setCsvFileName(importToUndo.previousFileName);
    setCsvStep("idle");
    setAddMode("manual");

    try {
      await Promise.all(
        importToUndo.createdImageUris
          .filter((uri) => !retainedImageUris.has(uri))
          .map((uri) => deleteImage(uri))
      );
    } finally {
      importActionInFlightRef.current = false;
    }
  };

  const handleManagedImageCreated = (uri: string) => {
    setLastSuccessfulImport((current) => {
      if (!current || current.createdImageUris.includes(uri)) {
        return current;
      }
      return {
        ...current,
        createdImageUris: [...current.createdImageUris, uri],
      };
    });
  };

  const handleDiscardPendingImport = () => {
    if (!pendingImport || isImportBusy || importActionInFlightRef.current) {
      return;
    }

    setPendingImport(null);
    setCsvStep("idle");
  };

  const handleNavigateToSettings = async () => {
    if (
      csvStep === "analyzing" ||
      csvStep === "importing" ||
      importActionInFlightRef.current
    ) {
      return;
    }
    if (pendingImport) {
      setPopup({
        message: t("courseCreator.import.popups.confirmPendingImport"),
        color: "disoriented",
        duration: 3500,
      });
      return;
    }
    importActionInFlightRef.current = true;

    try {
      const cleanName = courseName.trim();
      if (!cleanName) {
        setPopup({
          message: t("courseCreator.import.popups.missingCourseName"),
          color: "angry",
          duration: 3000,
        });
        router.back();
        return;
      }
      if (!iconId) {
        setPopup({
          message: t("courseCreator.import.popups.missingCourseIcon"),
          color: "angry",
          duration: 3000,
        });
        router.back();
        return;
      }

      if (getNonEmptyManualCards(manualCards).length === 0) {
        setPopup({
          message: t("courseCreator.import.popups.addAtLeastOne"),
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
      if (!isScreenMountedRef.current) return;

      const settingsPath = pathname.startsWith("/custom_profile")
        ? "/custom_profile/settings"
        : "/custom_course/settings";
      router.push({ pathname: settingsPath, params: paramsToPass });
    } catch (error) {
      console.warn("Failed to persist content draft before navigation", error);
    } finally {
      importActionInFlightRef.current = false;
    }
  };

  const handleAddModeChange = (nextMode: AddMode) => {
    if (isImportBusy || importActionInFlightRef.current) return;
    setAddMode(nextMode);
  };

  const handleGoBack = () => {
    if (isImportBusy || importActionInFlightRef.current) return;
    router.back();
  };

  const importPreview = lastSuccessfulImport ? (
    <View style={styles.csvPreviewCard}>
      <Text style={styles.csvPreviewTitle}>{t("courseCreator.import.previewTitle")}</Text>

      <View style={styles.csvStatsGrid}>
        <View style={styles.csvStatBox}>
          <Text style={styles.csvStatLabel}>{t("courseCreator.import.stats.flashcards")}</Text>
          <Text style={styles.csvStatValue}>{lastSuccessfulImport.cardsCount}</Text>
        </View>
        <View style={styles.csvStatBox}>
          <Text style={styles.csvStatLabel}>{t("courseCreator.import.stats.errors")}</Text>
          <Text style={styles.csvStatValue}>{lastSuccessfulImport.errorCount}</Text>
        </View>
      </View>

      <View style={styles.csvActionRow}>
        <MyButton
          text={t("courseCreator.import.undoImport")}
          color="my_red"
          width={138}
          disabled={isImportBusy}
          onPress={handleUndoImport}
        />
      </View>
    </View>
  ) : null;

  const pendingIssues = pendingImport?.analysis.issues ?? [];

  const pendingImportPreview = pendingImport ? (
    <View style={styles.csvPreviewCard}>
      <Text style={styles.csvPreviewTitle}>{t("courseCreator.import.previewTitle")}</Text>

      <View style={styles.csvStatsGrid}>
        <View style={styles.csvStatBox}>
          <Text style={styles.csvStatLabel}>{t("courseCreator.import.stats.flashcards")}</Text>
          <Text style={styles.csvStatValue}>{pendingImport.analysis.validRows.length}</Text>
        </View>
        <View style={styles.csvStatBox}>
          <Text style={styles.csvStatLabel}>{t("courseCreator.import.stats.errors")}</Text>
          <Text style={styles.csvStatValue}>{pendingImport.errorCount}</Text>
        </View>
      </View>

      <View style={styles.csvErrorsBox}>
        <Text style={styles.csvErrorsTitle}>{t("courseCreator.import.issuesToReview")}</Text>
        {pendingIssues.slice(0, 3).map((issue, index) => {
          const location = issue.row
            ? t("courseCreator.import.errorRow", { row: issue.row })
            : t("courseCreator.import.fileError");
          const locationWithField = issue.field
            ? `${location} - ${getCsvFieldLabel(issue.field, locale)}`
            : location;

          return (
            <View key={`${issue.code}-${issue.row ?? "file"}-${index}`} style={styles.csvErrorRow}>
              <Text style={styles.csvErrorLocation}>{locationWithField}</Text>
            </View>
          );
        })}
        {pendingIssues.length > 3 ? (
          <Text style={styles.csvErrorsMore}>
            {t("courseCreator.import.moreIssuesCompact", { count: pendingIssues.length - 3 })}
          </Text>
        ) : null}
      </View>

      <View style={styles.csvActionRow}>
        <MyButton
          text={t("courseCreator.import.importFlashcards")}
          color="my_green"
          width={148}
          disabled={isImportBusy}
          onPress={handleImportPendingRows}
        />
        <MyButton
          text={t("courseCreator.import.discardImport")}
          color="my_red"
          width={128}
          disabled={isImportBusy}
          onPress={handleDiscardPendingImport}
        />
      </View>
    </View>
  ) : null;

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <View
          style={[
            styles.section,
            shouldShowManualToolbar && styles.sectionWithManualToolbar,
          ]}
        >
          <Text style={styles.sectionHeader}>{t("courseCreator.import.sectionHeader")}</Text>
          <SegmentedTabs
            options={segmentOptions}
            value={addMode}
            onChange={handleAddModeChange}
            accessibilityLabel={t("courseCreator.import.addModeA11y")}
            containerStyle={styles.addModeTabs}
          />

          {addMode === "csv" ? (
            <View style={styles.modeContainer}>
              <CsvImportGuide
                onPickFile={handlePickFile}
                onDownloadTemplate={handleDownloadTemplate}
                downloadingTemplateKey={downloadingTemplateKey}
                selectedFileName={pendingImport?.fileName ?? csvFileName}
                isAnalyzing={isImportBusy}
              />
              {pendingImportPreview ?? importPreview}
            </View>
          ) : (
            <View style={styles.modeContainer}>
              {importPreview}
              <Text style={styles.miniSectionHeader}>{t("courseCreator.import.flashcardsHeader")}</Text>
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
                onManagedImageCreated={handleManagedImageCreated}
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
              label={t("courseCreator.import.cardTypeLabel")}
              labelHidden
              size="compact"
              dropdownDirection="up"
              containerStyle={styles.manualTypeSelector}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("courseCreator.import.addCardA11y")}
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
            disabled={isImportBusy}
            width={60}
            accessibilityLabel={t("courseCreator.import.backA11y")}
          >
            <Ionicons name="arrow-back" size={28} style={styles.returnbtn} />
          </MyButton>

          <MyButton
            text={t("app.actions.next")}
            color="my_green"
            onPress={handleNavigateToSettings}
            disabled={isImportBusy}
            accessibilityLabel={t("courseCreator.import.nextA11y")}
          />
        </View>
      </View>
    </View>
  );
}
