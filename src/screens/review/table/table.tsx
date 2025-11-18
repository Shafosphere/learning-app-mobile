import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useStyles } from "./table-styles";
import MyButton from "@/src/components/button/button";
import { ManualCard } from "@/src/hooks/useManualCardsForm";
import {
  ManualCardsEditor,
  type ManualCardsDisplayAction,
  type ManualCardsEditorStyles,
} from "@/src/screens/courses/editcourse/components/editFlashcards/editFlashcards";
import Entypo from "@expo/vector-icons/Entypo";
import {
  completeSessionStep,
  destroySession,
  getSessionResults,
  getSessionStep,
  type SessionWordResult,
  type SessionWordStatus,
} from "@/src/screens/review/minigames/sessionStore";
import { advanceCustomReview, advanceReview } from "@/src/db/sqlite/db";

type TableParams = {
  words?: string | string[];
  sessionId?: string | string[];
  stepId?: string | string[];
};

type TableWord = {
  id: number;
  term: string;
  translations: string[];
  status?: SessionWordStatus;
};

const extractParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function Table() {
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<TableParams>();
  const completionRef = useRef(false);
  const persistenceRef = useRef(false);

  const sessionIdParam = extractParam(params.sessionId);
  const stepIdParam = extractParam(params.stepId);

  const sessionId =
    typeof sessionIdParam === "string" && sessionIdParam.length > 0
      ? sessionIdParam
      : null;
  const stepId =
    typeof stepIdParam === "string" && stepIdParam.length > 0
      ? stepIdParam
      : null;

  const sessionStep = useMemo(() => {
    if (!sessionId || !stepId) {
      return null;
    }

    const step = getSessionStep(sessionId, stepId);
    return step && step.type === "table" ? step : null;
  }, [sessionId, stepId]);

  const isSessionMode = sessionStep != null;

  const sessionResults = useMemo(() => {
    if (!sessionId) {
      return null;
    }
    return getSessionResults(sessionId);
  }, [sessionId]);

  const persistSessionOutcomes = useCallback(
    async (results: SessionWordResult[] | null) => {
      if (!results) {
        return;
      }
      const tasks: Promise<unknown>[] = [];
      for (const entry of results) {
        if (entry.status !== "correct" || !entry.context) {
          continue;
        }
        if (entry.context.kind === "official") {
          tasks.push(
            advanceReview(
              entry.wordId,
              entry.context.sourceLangId,
              entry.context.targetLangId
            ).catch((error) => {
              console.warn(
                "[Table] Failed to advance review word",
                entry.wordId,
                error
              );
            })
          );
        } else if (entry.context.kind === "custom") {
          tasks.push(
            advanceCustomReview(entry.wordId, entry.context.courseId).catch(
              (error) => {
                console.warn(
                  "[Table] Failed to advance custom review word",
                  entry.wordId,
                  error
                );
              }
            )
          );
        }
      }

      if (tasks.length === 0) {
        return;
      }

      await Promise.allSettled(tasks);
    },
    []
  );

  useEffect(() => {
    if (!isSessionMode || !sessionId || !sessionStep) {
      return;
    }

    if (completionRef.current) {
      return;
    }

    completionRef.current = true;
    completeSessionStep(sessionId, sessionStep.id);
  }, [isSessionMode, sessionId, sessionStep]);

  useEffect(() => {
    persistenceRef.current = false;
  }, [sessionId]);

  useEffect(() => {
    if (!isSessionMode || !sessionId || !sessionResults) {
      return;
    }
    if (persistenceRef.current) {
      return;
    }
    persistenceRef.current = true;
    void persistSessionOutcomes(sessionResults);
  }, [isSessionMode, persistSessionOutcomes, sessionId, sessionResults]);

  const words = useMemo(() => {
    if (isSessionMode) {
      if (!sessionResults || sessionResults.length === 0) {
        return [] as TableWord[];
      }

      return sessionResults.map((entry) => ({
        id: entry.wordId,
        term: entry.term,
        translations: entry.translations,
        status: entry.status,
      }));
    }

    const raw = extractParam(params.words);

    if (typeof raw !== "string" || raw.length === 0) {
      return [] as TableWord[];
    }

    try {
      const decoded = decodeURIComponent(raw);
      const parsed = JSON.parse(decoded);

      if (!Array.isArray(parsed)) {
        return [];
      }

      const sanitized: TableWord[] = [];

      parsed.forEach((entry) => {
        if (
          typeof entry !== "object" ||
          entry === null ||
          typeof (entry as { term?: unknown }).term !== "string" ||
          !Array.isArray((entry as { translations?: unknown }).translations)
        ) {
          return;
        }

        const term = (entry as { term: string }).term.trim();
        const translations = (entry as { translations: unknown[] }).translations
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter((value) => value.length > 0);

        if (term.length === 0 || translations.length === 0) {
          return;
        }

        const statusValue =
          typeof (entry as { status?: unknown }).status === "string"
            ? (entry as { status: string }).status
            : undefined;

        const normalizedStatus: SessionWordStatus | undefined =
          statusValue === "correct" ||
          statusValue === "incorrect" ||
          statusValue === "pending"
            ? (statusValue as SessionWordStatus)
            : undefined;

        sanitized.push({
          id:
            typeof (entry as { id?: unknown }).id === "number"
              ? (entry as { id: number }).id
              : Number.NaN,
          term,
          translations,
          status: normalizedStatus,
        });
      });

      return sanitized;
    } catch (error) {
      console.warn("[Table] Failed to parse words param", error);
      return [];
    }
  }, [isSessionMode, params.words, sessionResults]);

  const manualCardEntries = useMemo(
    () =>
      words.map((word, index) => {
        const id =
          typeof word.id === "number" && Number.isFinite(word.id)
            ? `word-${word.id}`
            : `word-display-${index}`;
        return {
          card: {
            id,
            front: word.term,
            answers: word.translations.length > 0 ? word.translations : ["—"],
            flipped: true,
          } satisfies ManualCard,
          status: word.status,
        };
      }),
    [words]
  );

  const manualCards = useMemo(
    () => manualCardEntries.map((entry) => entry.card),
    [manualCardEntries]
  );

  const manualCardStatuses = useMemo(() => {
    const map: Record<string, SessionWordStatus | undefined> = {};
    manualCardEntries.forEach((entry) => {
      map[entry.card.id] = entry.status;
    });
    return map;
  }, [manualCardEntries]);

  const handleLoopAction = useCallback((card: ManualCard) => {
    console.log("[Table] Loop action triggered for card", card.id);
  }, []);

  const loopAction = useMemo<ManualCardsDisplayAction>(
    () => ({
      icon: (
        <Entypo
          name="loop"
          size={24}
          color={styles.loopIcon.color ?? "black"}
        />
      ),
      onPress: handleLoopAction,
      accessibilityLabel: (card: ManualCard, index: number) =>
        `Przełącz fiszkę ${index + 1}`,
    }),
    [handleLoopAction, styles.loopIcon.color]
  );

  const hasData = manualCards.length > 0;
  const backLabel = isSessionMode ? "Zakończ" : "Wróć";

  const handleBack = () => {
    if (isSessionMode && sessionId) {
      destroySession(sessionId);
      router.replace("/review/brain");
      return;
    }

    router.replace("/review/brain");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Podsumowanie</Text>
      <View style={styles.table}>
        {hasData ? (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.tableBody}
            showsVerticalScrollIndicator={false}
          >
            <ManualCardsEditor
              manualCards={manualCards}
              styles={{} as ManualCardsEditorStyles}
              mode="display"
              displayAction={loopAction}
              displayStatuses={manualCardStatuses}
            />
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Brak słówek do wyświetlenia. Wróć do ekranu Brain, aby pobrać
              fiszki.
            </Text>
          </View>
        )}
      </View>
      <View style={styles.footer}>
        <MyButton text={backLabel} onPress={handleBack} width={120} />
      </View>
    </View>
  );
}
