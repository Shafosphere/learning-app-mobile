import React, { useEffect, useMemo, useRef } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useStyles } from "./table-styles";
import MyButton from "@/src/components/button/button";
import {
  completeSessionStep,
  destroySession,
  getSessionResults,
  getSessionStep,
  type SessionWordStatus,
} from "@/src/screens/review/minigames/sessionStore";

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

type TableRow = {
  key: string;
  term: string;
  translation: string;
  status?: SessionWordStatus;
};

const extractParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function Table() {
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<TableParams>();
  const completionRef = useRef(false);

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

        sanitized.push({
          id: typeof (entry as { id?: unknown }).id === "number"
            ? (entry as { id: number }).id
            : Number.NaN,
          term,
          translations,
        });
      });

      return sanitized;
    } catch (error) {
      console.warn("[Table] Failed to parse words param", error);
      return [];
    }
  }, [isSessionMode, params.words, sessionResults]);

  const rows = useMemo(() => {
    const result: TableRow[] = [];

    words.forEach((word) => {
      if (word.translations.length === 0) {
        result.push({
          key: `${word.id}-0`,
          term: word.term,
          translation: "—",
          status: word.status,
        });
        return;
      }

      word.translations.forEach((translation, index) => {
        result.push({
          key: `${word.id}-${index}`,
          term: index === 0 ? word.term : "",
          translation,
          status: word.status,
        });
      });
    });

    return result;
  }, [words]);

  const hasData = rows.length > 0;
  const backLabel = isSessionMode ? "Zakończ" : "Wróć";

  const handleBack = () => {
    if (isSessionMode && sessionId) {
      destroySession(sessionId);
      router.replace("/review/brain");
      return;
    }

    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tablica słówek</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.termColumn]}>Słówko</Text>
          <Text style={[styles.headerCell, styles.translationColumn]}>
            Tłumaczenie
          </Text>
        </View>
        {hasData ? (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.tableBody}
          >
            {rows.map((row) => (
              <View
                key={row.key}
                style={[
                  styles.tableRow,
                  row.status === "correct" && styles.rowCorrect,
                  row.status === "incorrect" && styles.rowIncorrect,
                ]}
              >
                <Text
                  style={[
                    styles.cell,
                    styles.termColumn,
                    row.status === "correct" && styles.cellCorrect,
                    row.status === "incorrect" && styles.cellIncorrect,
                  ]}
                >
                  {row.term}
                </Text>
                <Text
                  style={[
                    styles.cell,
                    styles.translationColumn,
                    row.status === "correct" && styles.cellCorrect,
                    row.status === "incorrect" && styles.cellIncorrect,
                  ]}
                >
                  {row.translation}
                </Text>
              </View>
            ))}
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
      <MyButton text={backLabel} onPress={handleBack} width={120} />
    </View>
  );
}
