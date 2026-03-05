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
import {
  getCsvTemplate,
  type CsvTemplateKey,
} from "@/src/screens/courses/makenewcourse/csvImport/templates";
import { getCsvFieldLabel } from "@/src/screens/courses/makenewcourse/csvImport/schema";
import type { CsvAnalysisResult } from "@/src/screens/courses/makenewcourse/csvImport/types";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import * as Sharing from "expo-sharing";
import {
  Animated,
  LayoutChangeEvent,
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
} from "./contentDraft";
import { useStyles } from "./importFlashcards-styles";

type CsvStep = "idle" | "analyzing" | "preview" | "importing";

export default function CustomCourseContentScreen() {
  const segmentedPad = 4;
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
      label: t("courseCreator.import.cardTypes.knowDontKnow"),
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
  const [addModeTabsWidth, setAddModeTabsWidth] = useState(0);
  const addModeSliderX = useState(() => new Animated.Value(0))[0];
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
  const [downloadingTemplateKey, setDownloadingTemplateKey] =
    useState<CsvTemplateKey | null>(null);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);

  const shouldShowManualToolbar = addMode === "manual";
  const addModeSliderWidth = Math.max(0, (addModeTabsWidth - segmentedPad * 2) / 2);

  const handleAddModeTabsLayout = useCallback((event: LayoutChangeEvent) => {
    setAddModeTabsWidth(event.nativeEvent.layout.width);
  }, []);

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
    if (addModeSliderWidth <= 0) {
      return;
    }
    const targetX = addMode === "manual" ? addModeSliderWidth : 0;
    Animated.timing(addModeSliderX, {
      toValue: targetX,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [addMode, addModeSliderWidth, addModeSliderX]);

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
      setCsvFileName(fileName);
      setCsvStep("analyzing");

      const parsed = await parseImportFile({
        uri: asset.uri,
        name: asset.name,
        locale,
      });
      const analysis = analyzeRows(parsed, { locale });
      setCsvAnalysis(analysis);
      setCsvStep("preview");

      const errorCount = analysis.issues.filter((issue) => issue.severity === "error").length;
      const warningCount = analysis.issues.filter((issue) => issue.severity === "warning").length;

      if (analysis.validRows.length === 0) {
        setPopup({
          message: t("courseCreator.import.popups.noRows"),
          color: "angry",
          duration: 3500,
        });
        return;
      }

      setPopup({
        message:
          errorCount > 0
            ? t("courseCreator.import.popups.analyzedWithErrors", {
                validRows: analysis.validRows.length,
                errorCount,
              })
            : warningCount > 0
              ? t("courseCreator.import.popups.analyzedWithWarnings", {
                  validRows: analysis.validRows.length,
                  warningCount,
                })
              : t("courseCreator.import.popups.analyzedSuccess", {
                  validRows: analysis.validRows.length,
                }),
        color: warningCount > 0 || errorCount > 0 ? "disoriented" : "calm",
        duration: 3500,
      });
    } catch (error) {
      console.error("File parse/analyze error", error);
      setCsvStep("idle");
      setPopup({
        message: t("courseCreator.import.popups.analysisError"),
        color: "angry",
        duration: 4000,
      });
    }
  };

  const handlePickCsvFile = async () => {
    await handlePickImportFile([
      "text/csv",
      "application/zip",
      "application/x-zip-compressed",
      "*/*",
    ]);
  };

  const handlePickTxtFile = async () => {
    await handlePickImportFile([
      "text/plain",
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

  const handleImportAnalyzedRows = async () => {
    if (!csvAnalysis) return;
    try {
      setCsvStep("importing");
      const cards = await mapAnalysisToManualCards(csvAnalysis);

      if (!cards.length) {
        setPopup({
          message: t("courseCreator.import.popups.noCardsToImport"),
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
            ? t("courseCreator.import.popups.importedWithSkipped", {
                cardsCount: cards.length,
                skipped,
              })
            : warningCount > 0
              ? t("courseCreator.import.popups.importedWithWarnings", {
                  cardsCount: cards.length,
                  warningCount,
                })
              : t("courseCreator.import.popups.importedSuccess", {
                  cardsCount: cards.length,
                }),
        color: skipped > 0 ? "disoriented" : "calm",
        duration: 4000,
      });
      setCsvStep("preview");
    } catch (error) {
      console.error("CSV import error", error);
      setPopup({
        message: t("courseCreator.import.popups.importError"),
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
          <Text style={styles.sectionHeader}>{t("courseCreator.import.sectionHeader")}</Text>
          <View
            style={styles.addModeTabs}
            accessibilityRole="tablist"
            accessibilityLabel={t("courseCreator.import.addModeA11y")}
            onLayout={handleAddModeTabsLayout}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                styles.addModeThumb,
                {
                  width: addModeSliderWidth,
                  left: segmentedPad,
                  transform: [{ translateX: addModeSliderX }],
                },
              ]}
            />
            {segmentOptions.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => setAddMode(option.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: addMode === option.key }}
                style={styles.addModeTab}
              >
                <View style={styles.addModeTabContent}>
                  <View
                    style={[
                      styles.addModeDot,
                      addMode === option.key && styles.addModeDotActive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.addModeTabText,
                      addMode === option.key && styles.addModeTabTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          {addMode === "csv" ? (
            <View style={styles.modeContainer}>
              <CsvImportGuide
                onPickCsvFile={handlePickCsvFile}
                onPickTxtFile={handlePickTxtFile}
                onDownloadTemplate={handleDownloadTemplate}
                downloadingTemplateKey={downloadingTemplateKey}
                selectedFileName={csvFileName}
                isAnalyzing={csvStep === "analyzing"}
              />

              {csvAnalysis ? (
                <View style={styles.csvPreviewCard}>
                  <Text style={styles.csvPreviewTitle}>{t("courseCreator.import.previewTitle")}</Text>

                  <View style={styles.csvStatsGrid}>
                    <View style={styles.csvStatBox}>
                      <Text style={styles.csvStatLabel}>{t("courseCreator.import.stats.rows")}</Text>
                      <Text style={styles.csvStatValue}>{csvAnalysis.totalRows}</Text>
                    </View>
                    <View style={styles.csvStatBox}>
                      <Text style={styles.csvStatLabel}>{t("courseCreator.import.stats.importable")}</Text>
                      <Text style={styles.csvStatValue}>{csvAnalysis.validRows.length}</Text>
                    </View>
                    <View style={styles.csvStatBox}>
                      <Text style={styles.csvStatLabel}>{t("courseCreator.import.stats.errors")}</Text>
                      <Text style={styles.csvStatValue}>{csvErrorCount}</Text>
                    </View>
                    <View style={styles.csvStatBox}>
                      <Text style={styles.csvStatLabel}>{t("courseCreator.import.stats.warnings")}</Text>
                      <Text style={styles.csvStatValue}>{csvWarningCount}</Text>
                    </View>
                  </View>

                  <View style={styles.csvTypeStatsRow}>
                    <Text style={styles.csvTypePill}>
                      {t("courseCreator.import.cardTypes.text")}: {csvAnalysis.statsByType.traditional}
                    </Text>
                    <Text style={styles.csvTypePill}>
                      {t("courseCreator.import.cardTypes.trueFalse")}: {csvAnalysis.statsByType.true_false}
                    </Text>
                    <Text style={styles.csvTypePill}>
                      {t("courseCreator.import.cardTypes.knowDontKnow")}: {csvAnalysis.statsByType.self_assess}
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
                          {issue.row
                            ? t("courseCreator.import.issueRow", { row: issue.row })
                            : ""}
                          {issue.field
                            ? ` (${getCsvFieldLabel(issue.field, locale)})`
                            : ""}: {issue.message}
                        </Text>
                      ))}
                      {csvAnalysis.issues.length > 12 ? (
                        <Text style={styles.csvIssueTextMuted}>
                          {t("courseCreator.import.moreIssues", {
                            count: csvAnalysis.issues.length - 12,
                          })}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={styles.csvActionRow}>
                    <MyButton
                      text={csvStep === "importing"
                        ? t("courseCreator.import.importing")
                        : t("courseCreator.import.importValid")}
                      color="my_green"
                      width={190}
                      disabled={csvStep === "importing" || csvAnalysis.validRows.length === 0}
                      onPress={handleImportAnalyzedRows}
                    />
                    <MyButton
                      text={t("courseCreator.import.clearReport")}
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
            disabled={false}
            width={60}
            accessibilityLabel={t("courseCreator.import.backA11y")}
          >
            <Ionicons name="arrow-back" size={28} style={styles.returnbtn} />
          </MyButton>

          <MyButton
            text={t("courseCreator.import.next")}
            color="my_green"
            onPress={handleNavigateToSettings}
            accessibilityLabel={t("courseCreator.import.nextA11y")}
          />
        </View>
      </View>
    </View>
  );
}
