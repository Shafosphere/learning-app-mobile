import MyButton from "@/src/components/button/button";
import {
  ManualCardsEditor,
  type ManualCardsEditorStyles,
} from "@/src/components/courseEditor/editFlashcards/editFlashcards";
import {
  getCustomFlashcardById,
  updateCustomFlashcard,
} from "@/src/db/sqlite/repositories/flashcards";
import { useManualCardsForm, normalizeAnswers } from "@/src/hooks/useManualCardsForm";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import { notifyFlashcardUpdated } from "@/src/services/flashcardUpdated";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { mapCustomCardToWord } from "@/src/utils/flashcardsMapper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

const EDIT_FLASHCARD_TABLET_MAX_WIDTH = 500;

const useStyles = createThemeStylesHook((colors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { width: "100%", alignSelf: "center" as const },
  scrollViewTablet: { maxWidth: EDIT_FLASHCARD_TABLET_MAX_WIDTH },
  content: { padding: 16, paddingBottom: 110 },
  title: { color: colors.headline, fontSize: 24, fontWeight: "800", marginBottom: 12 },
  error: { color: colors.my_red, fontSize: 16, textAlign: "center" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  actions: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  actionsInner: {
    width: "100%",
    alignSelf: "center" as const,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
  },
  actionsInnerTablet: { maxWidth: EDIT_FLASHCARD_TABLET_MAX_WIDTH },
}));

const toPositiveNumber = (value: string | string[] | undefined): number | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  const number = Number(raw);
  return Number.isInteger(number) && number > 0 ? number : null;
};

export default function EditFlashcardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles();
  const { isTabletLayout } = useDeviceLayout();
  const params = useLocalSearchParams<{ courseId?: string | string[]; flashcardId?: string | string[] }>();
  const courseId = toPositiveNumber(params.courseId);
  const flashcardId = toPositiveNumber(params.flashcardId);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const {
    manualCards,
    replaceManualCards,
    handleManualCardFrontChange,
    handleManualCardAnswerChange,
    handleAddAnswer,
    handleRemoveAnswer,
    handleToggleFlipped,
    handleManualCardImageChange,
    handleManualCardExplanationChange,
  } = useManualCardsForm();

  const load = useCallback(async () => {
    if (!courseId || !flashcardId) {
      setLoadError(t("flashcards.cardEditor.notFound"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    setError(null);
    try {
      const card = await getCustomFlashcardById(courseId, flashcardId);
      if (!card) throw new Error("not-found");
      replaceManualCards([{ 
        id: String(card.id), front: card.frontText, answers: card.answers.length ? card.answers : [""],
        flipped: card.flipped, answerOnly: card.answerOnly, type: card.type as "text" | "true_false" | "know_dont_know",
        hintFront: card.hintFront, hintBack: card.hintBack, imageFront: card.imageFront,
        imageBack: card.imageBack, explanation: card.explanation,
      }]);
    } catch {
      setLoadError(t("flashcards.cardEditor.notFound"));
    } finally {
      setLoading(false);
    }
  }, [courseId, flashcardId, replaceManualCards, t]);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(async () => {
    const card = manualCards[0];
    if (!courseId || !flashcardId || !card) return;
    const answers = normalizeAnswers(card.answers);
    if (!card.front.trim() && answers.length === 0 && !card.imageFront) {
      setError(t("flashcards.cardEditor.missingContent"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateCustomFlashcard(courseId, flashcardId, {
        frontText: card.front,
        answers,
        imageFront: card.imageFront,
        imageBack: card.imageBack,
        explanation: card.explanation,
        flipped: card.flipped,
      });
      notifyFlashcardUpdated({ courseId, card: mapCustomCardToWord(updated) });
      router.back();
    } catch {
      setError(t("flashcards.cardEditor.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [courseId, flashcardId, manualCards, router, t]);

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" /></View>;

  return (
    <View style={styles.container}>
      <ScrollView
        style={[styles.scrollView, isTabletLayout && styles.scrollViewTablet]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{t("flashcards.cardEditor.title")}</Text>
        {loadError ? <Text style={styles.error}>{loadError}</Text> : (
          <>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          <ManualCardsEditor
            manualCards={manualCards}
            styles={{} as ManualCardsEditorStyles}
            onCardFrontChange={handleManualCardFrontChange}
            onCardAnswerChange={handleManualCardAnswerChange}
            onAddAnswer={handleAddAnswer}
            onRemoveAnswer={handleRemoveAnswer}
            onToggleFlipped={handleToggleFlipped}
            onCardImageChange={handleManualCardImageChange}
            onCardExplanationChange={handleManualCardExplanationChange}
            hideRemoveCardAction
            showDefaultBottomAddButton={false}
          />
          </>
        )}
      </ScrollView>
      <View style={styles.actions}>
        <View style={[styles.actionsInner, isTabletLayout && styles.actionsInnerTablet]}>
          <MyButton text={t("app.actions.cancel")} color="my_yellow" onPress={() => router.back()} />
          <MyButton text={saving ? t("flashcards.cardEditor.saving") : t("flashcards.cardEditor.save")} disabled={Boolean(loadError) || saving} onPress={() => void save()} />
        </View>
      </View>
    </View>
  );
}
