import { useSettings } from "@/src/contexts/SettingsContext";
import { stripDiacritics } from "@/src/utils/diacritics";
import { getExplanationState } from "@/src/utils/explanationState";
import type { DatePattern } from "@/src/utils/dateInput";
import { calculateTypoDiff } from "@/src/utils/typoDiff";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  ScrollView,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { useStyles } from "./card-styles";
import type { CardDisplayMode, CardProps } from "./card-types";
import { CardContentResolver } from "./subcomponents/CardContentResolver";
import CardFrame from "./subcomponents/CardFrame";
import { CardHint } from "./subcomponents/CardHint";
import { CardMeasure } from "./subcomponents/CardMeasure";
import { useCardFocusController } from "./useCardFocusController";
import { useFocusExecutor } from "./useFocusExecutor";

const NUMBER_ANSWER_REGEX = /^\d+(?:[.,]\d+)?$/;
const YEAR_ANSWER_REGEX = /^\d{3,4}$/;
const DATE_ANSWER_REGEX = /^\d{3,4}-\d{2}(?:-\d{2})?$/;
const INPUT_HORIZONTAL_PADDING = 8;
const INPUT_SCROLL_AHEAD = 48; // keep ~2-3 letters visible ahead of the caret

type AnswerInputKind = "text" | "number" | "year" | "date";
const detectInputKind = (value: string): AnswerInputKind => {
  const trimmed = value.trim();
  if (!trimmed) return "text";
  if (DATE_ANSWER_REGEX.test(trimmed)) return "date";
  if (YEAR_ANSWER_REGEX.test(trimmed)) return "year";
  if (NUMBER_ANSWER_REGEX.test(trimmed)) return "number";
  return "text";
};

const resolveInputKind = (values: string[]): AnswerInputKind => {
  const normalizedKinds = values
    .map((entry) => detectInputKind(entry))
    .filter((kind) => kind !== "text");

  if (normalizedKinds.length === 0) return "text";
  if (normalizedKinds.every((kind) => kind === "date")) return "date";
  if (normalizedKinds.every((kind) => kind === "year")) return "year";
  if (normalizedKinds.every((kind) => kind === "number")) return "number";
  return "text";
};

const detectDatePattern = (value: string): DatePattern | null => {
  const trimmed = value.trim();
  if (/^\d{3,4}-\d{2}-\d{2}$/.test(trimmed)) return "ymd";
  if (/^\d{3,4}-\d{2}$/.test(trimmed)) return "ym";
  return null;
};

const resolveDatePattern = (values: string[]): DatePattern | null => {
  let result: DatePattern | null = null;
  for (const entry of values) {
    const pattern = detectDatePattern(entry);
    if (!pattern) continue;
    if (pattern === "ymd") return "ymd";
    result = "ym";
  }
  return result;
};

const formatDateLikeInput = (
  rawValue: string,
  pattern: DatePattern,
  previousFormatted?: string,
): string => {
  const deletingAutoHyphen =
    typeof previousFormatted === "string" &&
    previousFormatted.endsWith("-") &&
    rawValue === previousFormatted.slice(0, -1);
  if (deletingAutoHyphen) {
    return rawValue;
  }

  const digits = rawValue.replace(/\D/g, "");
  const maxLength = pattern === "ymd" ? 8 : 6;
  const clipped = digits.slice(0, maxLength);
  if (clipped.length <= 4) {
    if (clipped.length === 4) return `${clipped}-`;
    return clipped;
  }
  if (pattern === "ym") {
    return `${clipped.slice(0, 4)}-${clipped.slice(4)}`;
  }
  if (clipped.length <= 6) {
    const yearMonth = `${clipped.slice(0, 4)}-${clipped.slice(4)}`;
    if (clipped.length === 6) return `${yearMonth}-`;
    return yearMonth;
  }
  return `${clipped.slice(0, 4)}-${clipped.slice(4, 6)}-${clipped.slice(6)}`;
};

export default function Card({
  coachmarkId,
  selectedItem,
  reversed = false,
  answer,
  setAnswer,
  result,
  confirm,
  correction,
  wrongInputChange,
  introMode = false,
  setCorrectionRewers,
  onHintUpdate,
  isFocused = true,
  backgroundColorOverride,
  textColorOverride,
  hideHints = false,
  isBetweenCards = false,
  disableLayoutAnimation = false,
  focusRequestToken = 0,
  showExplanationEnabled: showExplanationEnabledProp,
  explanationOnlyOnWrong: explanationOnlyOnWrongProp,
}: CardProps) {
  const styles = useStyles();
  const {
    explanationOnlyOnWrong: explanationOnlyOnWrongSetting,
    showExplanationEnabled: showExplanationEnabledSetting,
    ignoreDiacriticsInSpellcheck,
    flashcardsSuggestionsEnabled,
    flashcardsCardSize,
    flashcardsImageSize,
  } = useSettings();
  const isIntroMode = Boolean(introMode && correction?.mode === "intro");
  const statusStyle =
    !isIntroMode && result !== null
      ? result
        ? styles.cardGood
        : styles.cardBad
      : undefined;
  const suggestionProps = useMemo(() => {
    const disabled = !flashcardsSuggestionsEnabled;
    return {
      autoCorrect: flashcardsSuggestionsEnabled,
      spellCheck: flashcardsSuggestionsEnabled,
      autoComplete: disabled ? ("off" as const) : undefined,
      textContentType: disabled ? ("none" as const) : undefined,
      importantForAutofill: disabled ? ("no" as const) : undefined,
      // On Android some keyboards still show suggestions; visible-password suppresses that bar.
      keyboardType:
        disabled && Platform.OS === "android"
          ? ("visible-password" as const)
          : undefined,
    };
  }, [flashcardsSuggestionsEnabled]);
  const trimTrailingSpaces = useCallback((value: string) => {
    return value.replace(/ +$/, "");
  }, []);
  const [translations, setTranslations] = useState<number>(0);
  const mainInputRef = useRef<TextInput | null>(null);
  const correctionInput1Ref = useRef<TextInput | null>(null);
  const correctionInput2Ref = useRef<TextInput | null>(null);
  const hintInputRef = useRef<TextInput | null>(null);
  const initialLayoutCardIdRef = useRef<number | null>(null);
  const [isLayoutAnimationArmed, setIsLayoutAnimationArmed] = useState(false);
  const lastTranslationItemId = useRef<number | null>(null);
  const previousCorrectionInput2 = useRef<string>("");
  const [input1LayoutWidth, setInput1LayoutWidth] = useState(0);
  const [input2LayoutWidth, setInput2LayoutWidth] = useState(0);
  const [input1TextWidth, setInput1TextWidth] = useState(0);
  const [input2TextWidth, setInput2TextWidth] = useState(0);
  const [input1ExpectedWidth, setInput1ExpectedWidth] = useState(0);
  const [input2ExpectedWidth, setInput2ExpectedWidth] = useState(0);
  const input1ScrollRef = useRef<ScrollView | null>(null);
  const input2ScrollRef = useRef<ScrollView | null>(null);
  const selectedItemId = selectedItem?.id ?? null;
  const activeTranslationIndex =
    lastTranslationItemId.current === selectedItemId ? translations : 0;
  const correctionWord = correction?.word ?? null;
  const correctionPromptText = correction?.promptText ?? "";
  const correctionPromptImageUri = correction?.promptImageUri ?? null;
  const correctionReversed = correction?.reversed ?? false;

  const awers = selectedItem?.text ?? "";
  const rewers = selectedItem?.translations?.[activeTranslationIndex] ?? "";
  const promptImageFront = selectedItem?.imageFront ?? null;
  const promptImageBack = selectedItem?.imageBack ?? null;
  const hasTextPrompt = Boolean(awers.trim());
  const hasImagePrompt = Boolean(promptImageFront || promptImageBack);
  const type = selectedItem?.type ?? "text";
  const answerOnly =
    (selectedItem?.answerOnly ?? false) ||
    (!hasTextPrompt && hasImagePrompt) ||
    type === "true_false" ||
    type === "know_dont_know";
  const showCorrectionInputs = Boolean(
    correction && (result === false || isIntroMode),
  );
  const effectiveAnswerOnly = showCorrectionInputs
    ? Boolean(correction?.answerOnly)
    : answerOnly;

  // Force answerOnly logic: if true, card can only be shown Front -> Back
  const effectiveReversed = showCorrectionInputs
    ? (effectiveAnswerOnly ? false : correctionReversed)
    : (answerOnly ? false : reversed);

  const promptImageUri = showCorrectionInputs
    ? correctionPromptImageUri
    : selectedItem
      ? effectiveReversed
        ? promptImageBack
        : promptImageFront
      : null;
  const promptText = showCorrectionInputs
    ? correctionPromptText
    : effectiveReversed
      ? rewers
      : awers;
  const correctionAwers = correction?.awers ?? awers;
  const correctionRewers = isIntroMode ? rewers : (correction?.rewers ?? "");
  const shouldCorrectAwers = showCorrectionInputs
    ? correctionReversed
    : effectiveReversed;
  const shouldCorrectRewers = showCorrectionInputs
    ? !correctionReversed || Boolean(correction?.answerOnly)
    : !effectiveReversed || answerOnly;
  const mainExpectedAnswers = useMemo(() => {
    if (!selectedItem) return [];
    if (effectiveReversed) {
      const awersValue = (selectedItem.text ?? "").trim();
      return awersValue ? [awersValue] : [];
    }
    return (selectedItem.translations ?? [])
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }, [effectiveReversed, selectedItem]);
  const mainAnswerKind = useMemo(
    () => resolveInputKind(mainExpectedAnswers),
    [mainExpectedAnswers],
  );
  const mainDatePattern = useMemo(
    () => resolveDatePattern(mainExpectedAnswers),
    [mainExpectedAnswers],
  );
  const correctionInput1Kind = useMemo(
    () => resolveInputKind([correctionAwers]),
    [correctionAwers],
  );
  const correctionInput2Kind = useMemo(
    () => resolveInputKind([correctionRewers]),
    [correctionRewers],
  );
  const correctionInput1DatePattern = useMemo(
    () => resolveDatePattern([correctionAwers]),
    [correctionAwers],
  );
  const correctionInput2DatePattern = useMemo(
    () => resolveDatePattern([correctionRewers]),
    [correctionRewers],
  );
  const isMainAnswerNumeric = useMemo(
    () => mainAnswerKind === "number" || mainAnswerKind === "year",
    [mainAnswerKind],
  );
  const isMainAnswerDate = useMemo(
    () => mainAnswerKind === "date",
    [mainAnswerKind],
  );
  const isCorrectionInput1Numeric = useMemo(
    () => correctionInput1Kind === "number" || correctionInput1Kind === "year",
    [correctionInput1Kind],
  );
  const isCorrectionInput1Date = useMemo(
    () => correctionInput1Kind === "date",
    [correctionInput1Kind],
  );
  const isCorrectionInput2Numeric = useMemo(
    () => correctionInput2Kind === "number" || correctionInput2Kind === "year",
    [correctionInput2Kind],
  );
  const isCorrectionInput2Date = useMemo(
    () => correctionInput2Kind === "date",
    [correctionInput2Kind],
  );
  const handleAnswerChange = useCallback(
    (value: string) => {
      if (isMainAnswerDate && mainDatePattern) {
        setAnswer(formatDateLikeInput(value, mainDatePattern, answer));
        return;
      }
      setAnswer(value);
    },
    [answer, isMainAnswerDate, mainDatePattern, setAnswer],
  );

  const [isEditingHint, setIsEditingHint] = useState(false);
  const [hintDraft, setHintDraft] = useState("");
  const hintDialogVisible = useRef(false);
  const hintActionsAnim = useRef(new Animated.Value(0)).current;
  const currentHint = useMemo(() => {
    if (!selectedItem) return null;
    return effectiveReversed
      ? (selectedItem.hintBack ?? null)
      : (selectedItem.hintFront ?? null);
  }, [effectiveReversed, selectedItem]);
  const shouldMarqueeHint = useMemo(() => {
    const len = currentHint?.length ?? 0;
    return len > 28;
  }, [currentHint]);
  const correctionPrimaryTarget = shouldCorrectAwers ? "correction1" : "correction2";
  const {
    focusTarget,
    focusRequestId,
    requestFocus,
    onCorrection1Completed,
    onHintEditStarted,
  } = useCardFocusController({
    isFocused,
    selectedItemId,
    result,
    isIntroMode,
    showCorrectionInputs,
    correctionCardId: correction?.cardId ?? null,
    correctionPrimaryTarget,
    isEditingHint,
  });
  useEffect(() => {
    if (!isFocused || selectedItemId == null) {
      return;
    }

    requestFocus(showCorrectionInputs ? correctionPrimaryTarget : "main");
  }, [
    correctionPrimaryTarget,
    focusRequestToken,
    isFocused,
    requestFocus,
    selectedItemId,
    showCorrectionInputs,
  ]);
  const showExplanationEnabled =
    showExplanationEnabledProp ?? showExplanationEnabledSetting;
  const explanationOnlyOnWrong =
    explanationOnlyOnWrongProp ?? explanationOnlyOnWrongSetting;
  const { explanationText, isExplanationVisible } = getExplanationState({
    selectedItem,
    result,
    showCorrectionInputs,
    showExplanationEnabled,
    explanationOnlyOnWrong,
  });
  // Decide if we should use large layout: either global setting OR image is present
  // True/false karty często mają dłuższy prompt; wymuś dynamiczną wysokość,
  // żeby tekst nie był ucinany nawet bez obrazka.
  const useLargeLayout =
    flashcardsCardSize === "large" ||
    hasImagePrompt ||
    selectedItem?.answerOnly ||
    selectedItem?.type === "true_false" ||
    selectedItem?.type === "know_dont_know";
  const promptImageSizeMode =
    flashcardsCardSize === "large" && hasImagePrompt
      ? flashcardsImageSize
      : "dynamic";

  const input1ContentWidth = useMemo(() => {
    const measured = Math.max(input1TextWidth, input1ExpectedWidth);
    const padded = measured + INPUT_HORIZONTAL_PADDING * 2;
    return Math.max(padded, input1LayoutWidth || 0);
  }, [input1ExpectedWidth, input1LayoutWidth, input1TextWidth]);
  const input2ContentWidth = useMemo(() => {
    const measured = Math.max(input2TextWidth, input2ExpectedWidth);
    const padded = measured + INPUT_HORIZONTAL_PADDING * 2;
    return Math.max(padded, input2LayoutWidth || 0);
  }, [input2ExpectedWidth, input2LayoutWidth, input2TextWidth]);

  const focusRefs = useMemo(
    () => ({
      main: mainInputRef,
      correction1: correctionInput1Ref,
      correction2: correctionInput2Ref,
      hint: hintInputRef,
    }),
    [],
  );
  useFocusExecutor({
    focusTarget,
    focusRequestId,
    refs: focusRefs,
  });

  const translationSource = showCorrectionInputs ? correctionWord : selectedItem;
  const len = translationSource?.translations?.length ?? 0;
  const isShowingTranslation = isIntroMode || promptText === rewers;
  const canToggleTranslations = !showCorrectionInputs && isShowingTranslation && len > 1;
  const next = () => {
    if (!len) return;
    setTranslations((i) => (i + 1) % len);
  };

  useLayoutEffect(() => {
    const currentId = selectedItemId;
    if (!isFocused) {
      return;
    }
    if (currentId === lastTranslationItemId.current) {
      return;
    }

    lastTranslationItemId.current = currentId;
    setTranslations((prev) => (prev === 0 ? prev : 0));
  }, [isFocused, selectedItemId]);

  useEffect(() => {
    if (!isIntroMode || !setCorrectionRewers) return;
    const nextTranslation =
      selectedItem?.translations?.[activeTranslationIndex] ?? "";
    setCorrectionRewers(nextTranslation);
  }, [
    activeTranslationIndex,
    isIntroMode,
    selectedItem?.translations,
    setCorrectionRewers,
  ]);

  const handleWrongInputChange = useCallback(
    (which: 1 | 2, value: string) => {
      if (which === 1 && isCorrectionInput1Date && correctionInput1DatePattern) {
        wrongInputChange(
          1,
          formatDateLikeInput(
            value,
            correctionInput1DatePattern,
            correction?.input1,
          ),
        );
        return;
      }
      if (which === 2 && isCorrectionInput2Date && correctionInput2DatePattern) {
        wrongInputChange(
          2,
          formatDateLikeInput(
            value,
            correctionInput2DatePattern,
            correction?.input2 ?? "",
          ),
        );
        return;
      }
      wrongInputChange(which, value);
    },
    [
      correction?.input1,
      correction?.input2,
      correctionInput1DatePattern,
      correctionInput2DatePattern,
      isCorrectionInput1Date,
      isCorrectionInput2Date,
      wrongInputChange,
    ],
  );

  const handleCorrectionInput1Change = useCallback(
    (t: string) => {
      handleWrongInputChange(1, t);
      if (correction?.awers) {
        const normalizeString = (value: string) => {
          let base = value.toLowerCase();
          if (ignoreDiacriticsInSpellcheck) {
            base = stripDiacritics(base);
          }
          return base;
        };
        const matches =
          normalizeString(trimTrailingSpaces(t)) ===
            normalizeString(correction.awers) &&
          trimTrailingSpaces(t).length === correction.awers.length;
        if (matches) {
          onCorrection1Completed();
        }
      }
    },
    [
      correction?.awers,
      handleWrongInputChange,
      ignoreDiacriticsInSpellcheck,
      onCorrection1Completed,
      trimTrailingSpaces,
    ],
  );

  const syncInputScroll = useCallback(
    (
      ref: React.RefObject<ScrollView | null>,
      caretX: number,
      visibleWidth: number,
      contentWidth: number,
    ) => {
      if (!visibleWidth) return;
      const maxOffset = Math.max(0, contentWidth - visibleWidth);
      const desiredOffset = Math.max(
        0,
        caretX - (visibleWidth - INPUT_SCROLL_AHEAD),
      );
      const nextOffset = Math.min(desiredOffset, maxOffset);
      ref.current?.scrollTo({ x: nextOffset, animated: false });
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    if (selectedItem?.translations && selectedItem.translations.length > 1) {
      setTranslations(0);
    }
    confirm(rewers);
  }, [confirm, rewers, selectedItem?.translations, setTranslations]);

  const previousResultForAnswerResetRef = useRef<boolean | null>(null);
  useEffect(() => {
    const backToMain =
      result !== false && previousResultForAnswerResetRef.current === false;
    if (backToMain && !isIntroMode) {
      setAnswer("");
    }
    previousResultForAnswerResetRef.current = result;
  }, [isIntroMode, result, setAnswer]);

  useEffect(() => {
    previousCorrectionInput2.current = trimTrailingSpaces(
      correction?.input2 ?? "",
    );
  }, [correction?.input2, trimTrailingSpaces]);

  useEffect(() => {
    if (!showCorrectionInputs || answerOnly) return;
    syncInputScroll(
      input1ScrollRef,
      input1TextWidth + INPUT_HORIZONTAL_PADDING,
      input1LayoutWidth,
      input1ContentWidth,
    );
  }, [
    input1ContentWidth,
    input1LayoutWidth,
    input1TextWidth,
    answerOnly,
    showCorrectionInputs,
    syncInputScroll,
  ]);

  useEffect(() => {
    if (!showCorrectionInputs) return;
    syncInputScroll(
      input2ScrollRef,
      input2TextWidth + INPUT_HORIZONTAL_PADDING,
      input2LayoutWidth,
      input2ContentWidth,
    );
  }, [
    input2ContentWidth,
    input2LayoutWidth,
    input2TextWidth,
    showCorrectionInputs,
    syncInputScroll,
  ]);

  useEffect(() => {
    if (disableLayoutAnimation || !isFocused) {
      initialLayoutCardIdRef.current = null;
      setIsLayoutAnimationArmed(false);
      return;
    }

    if (selectedItemId == null) {
      initialLayoutCardIdRef.current = null;
      return;
    }

    if (initialLayoutCardIdRef.current == null) {
      initialLayoutCardIdRef.current = selectedItemId;
      return;
    }

    if (initialLayoutCardIdRef.current === selectedItemId) {
      return;
    }

    setIsLayoutAnimationArmed((prev) => (prev ? prev : true));
  }, [disableLayoutAnimation, isFocused, selectedItemId]);

  useEffect(() => {
    setIsEditingHint(false);
    setHintDraft(currentHint ?? "");
    hintDialogVisible.current = false;
  }, [currentHint, effectiveReversed, selectedItem?.id]);

  function normalizeChar(char: string | undefined): string {
    if (!char) return "";
    let normalized = char.toLowerCase();
    if (ignoreDiacriticsInSpellcheck) {
      normalized = stripDiacritics(normalized);
    }
    return normalized;
  }

  function isCharMismatchAt(
    value: string,
    expected: string,
    index: number,
  ): boolean {
    const inputChar = value[index];
    if (!inputChar) return false;
    const expectedChar = expected?.[index];
    if (!expectedChar) return true;
    return normalizeChar(inputChar) !== normalizeChar(expectedChar);
  }

  function renderOverlayText(value: string, expected: string) {
    if (!value) return null;
    return value.split("").map((char, idx) => {
      const mismatch = isCharMismatchAt(value, expected, idx);
      const displayChar = char === " " ? "\u00A0" : char;
      const charStyle = mismatch
        ? styles.overlayCharError
        : styles.overlayCharNeutral;
      return (
        <Text key={`overlay-${idx}`} style={charStyle}>
          {displayChar}
        </Text>
      );
    });
  }

  const startHintEditing = useCallback(() => {
    if (!selectedItem || !onHintUpdate) return;
    setHintDraft(currentHint ?? "");
    setIsEditingHint(true);
    onHintEditStarted();
  }, [currentHint, onHintEditStarted, onHintUpdate, selectedItem]);

  const deleteHint = useCallback(() => {
    if (!selectedItem || !onHintUpdate) return;
    const nextFront = effectiveReversed
      ? (selectedItem.hintFront ?? null)
      : null;
    const nextBack = effectiveReversed
      ? null
      : (selectedItem.hintBack ?? null);
    onHintUpdate(selectedItem.id, nextFront, nextBack);
    setIsEditingHint(false);
    setHintDraft("");
  }, [effectiveReversed, onHintUpdate, selectedItem]);

  const cancelHintEditing = useCallback(() => {
    setIsEditingHint(false);
    setHintDraft(currentHint ?? "");
    hintDialogVisible.current = false;
  }, [currentHint]);

  const applyHintToSides = useCallback(
    (applyToBoth: boolean) => {
      if (!selectedItem) {
        setIsEditingHint(false);
        return;
      }
      const normalized = hintDraft.trim();
      const value = normalized.length > 0 ? normalized : null;
      if (!onHintUpdate) {
        setIsEditingHint(false);
        return;
      }
      const nextFront = applyToBoth
        ? value
        : effectiveReversed
          ? (selectedItem.hintFront ?? null)
          : value;
      const nextBack = applyToBoth
        ? value
        : effectiveReversed
          ? value
          : (selectedItem.hintBack ?? null);
      onHintUpdate(selectedItem.id, nextFront, nextBack);
      setIsEditingHint(false);
      setHintDraft(value ?? "");
    },
    [effectiveReversed, hintDraft, onHintUpdate, selectedItem],
  );

  const finishHintEditing = useCallback(() => {
    if (!selectedItem) return;
    const normalized = hintDraft.trim();
    if (!normalized) {
      setIsEditingHint(false);
      setHintDraft("");
      return;
    }
    if (hintDialogVisible.current) return;
    hintDialogVisible.current = true;
    Alert.alert("Gdzie wyświetlić podpowiedź?", undefined, [
      {
        text: "Anuluj",
        style: "cancel",
        onPress: () => {
          hintDialogVisible.current = false;
          setIsEditingHint(false);
        },
      },
      {
        text: "Tylko tu",
        onPress: () => {
          hintDialogVisible.current = false;
          applyHintToSides(false);
        },
      },
      {
        text: "Obie strony",
        onPress: () => {
          hintDialogVisible.current = false;
          applyHintToSides(true);
        },
      },
    ]);
  }, [applyHintToSides, hintDraft, selectedItem]);

  const hintActionsStyle = useMemo(
    () => ({
      opacity: hintActionsAnim,
      transform: [
        {
          translateX: hintActionsAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [24, 0],
          }),
        },
      ],
    }),
    [hintActionsAnim],
  );

  useEffect(() => {
    Animated.timing(hintActionsAnim, {
      toValue: isEditingHint ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [hintActionsAnim, isEditingHint]);

  const typoDiff = useMemo(() => {
    if (result !== true || !selectedItem) return null;

    // Check if it's a "perfect" match or a typo match
    // We need to compare answer vs target (handling multiple translations)
    // Find the translation that matched (closest) to generate the diff against it.

    // Helper to normalize for comparison
    const norm = (s: string) => {
      let v = s.toLowerCase().trim();
      if (ignoreDiacriticsInSpellcheck) v = stripDiacritics(v);
      return v;
    };

    const userAnswer = norm(answer);

    // Find best match among translations (or front text if reversed)
    let bestMatch: string | null = null;

    if (effectiveReversed) {
      // Answer should match 'awers' (text)
      const target = selectedItem.text;
      if (norm(target) === userAnswer) return null; // Perfect match
      bestMatch = target;
    } else {
      // Answer should match one of translations
      // If perfectly matches any, returns null
      const perfect = selectedItem.translations.some(
        (t) => norm(t) === userAnswer,
      );
      if (perfect) return null;

      // Otherwise find the one with diff
      bestMatch =
        selectedItem.translations.find((t) => {
          // We assume validation logic already passed, so one of them MUST be close enough.
          // But validation logic inside hook is complex.
          // Simplest is to find the one with minimal edit distance or just calculateDiff returns non-null
          return calculateTypoDiff(userAnswer, norm(t)) !== null;
        }) ?? selectedItem.translations[0]; // Fallback
    }

    if (!bestMatch) return null;

    // Calculate diff against the raw target string (but normalized for comparison?
    // Wait, visual diff should probably respect user's casing vs target casing?
    // User requested: "Greaja" vs "Grecja" -> "Gre <a> c ja"
    // So we should probably use the target string as the source of truth for the 'correction' char.

    // Issue: If we normalize everything, we lose case information for display?
    // User input "Greaja", Target "Grecja".
    // transform input to display.

    // Let's rely on the utility. But the utility compares character by character.
    // If we pass raw strings, "Grecja" vs "grecja" might be 1 diff (case).
    // If ignoreCase is on, we should probably lowercase both before diffing OR handle case diffs as 'valid'?
    // The requirement says "literowka". Usually implies actual char error.

    // Let's use normalization for finding the diff.
    return calculateTypoDiff(userAnswer, norm(bestMatch));
  }, [
    result,
    selectedItem,
    answer,
    effectiveReversed,
    ignoreDiacriticsInSpellcheck,
  ]);

  const displayMode = useMemo<CardDisplayMode>(() => {
    if (showCorrectionInputs) return "correction";
    if (isExplanationVisible) return "explanation";
    if (selectedItem?.type === "true_false" || selectedItem?.type === "know_dont_know") {
      return "true_false";
    }
    if (selectedItem) return "question";
    return "empty";
  }, [isExplanationVisible, selectedItem, showCorrectionInputs]);

  const resolverProps = {
    displayMode,
    correction,
    isIntroMode,
    explanationText,
    promptText,
    promptImageUri,
    promptImageSizeMode,
    correctionAwers,
    correctionRewers,
    answerOnly,
    shouldCorrectAwers,
    shouldCorrectRewers,
    isMainAnswerNumeric,
    isMainAnswerDate,
    mainDatePattern,
    isCorrectionInput1Numeric,
    isCorrectionInput1Date,
    correctionInput1DatePattern,
    isCorrectionInput2Numeric,
    isCorrectionInput2Date,
    correctionInput2DatePattern,
    useLargeLayout,
    correctionInput1Ref,
    correctionInput2Ref,
    input1ScrollRef,
    input2ScrollRef,
    handleCorrectionInput1Change,
    wrongInputChange: handleWrongInputChange,
    suggestionProps,
    renderOverlayText,
    input1ContentWidth,
    input2ContentWidth,
    setInput1LayoutWidth,
    setInput2LayoutWidth,
    focusTarget,
    requestFocus,
    onCorrection1Completed,
    previousCorrectionInput2,
    canToggleTranslations,
    next,
    input1LayoutWidth,
    input2LayoutWidth,
    answer,
    handleAnswerChange,
    mainInputRef,
    handleConfirm,
    typoDiff,
    textColorOverride,
  };

  const cardStateStyle = isIntroMode ? styles.cardIntro : statusStyle;

  return (
    <View style={styles.container}>
      {hideHints || isBetweenCards ? (
        <View style={styles.hintContainer} />
      ) : (
        <CardHint
          currentHint={currentHint}
          isEditingHint={isEditingHint}
          hintDraft={hintDraft}
          setHintDraft={setHintDraft}
          startHintEditing={startHintEditing}
          cancelHintEditing={cancelHintEditing}
          finishHintEditing={finishHintEditing}
          deleteHint={deleteHint}
          hintActionsStyle={hintActionsStyle}
          shouldMarqueeHint={shouldMarqueeHint}
          selectedItem={selectedItem}
          onHintUpdate={onHintUpdate}
          inputRef={hintInputRef}
          onHintInputBlur={cancelHintEditing}
        />
      )}
      <CardFrame
        coachmarkId={coachmarkId}
        compact={!useLargeLayout}
        animateLayout={!disableLayoutAnimation && isLayoutAnimationArmed}
        cardStateStyle={cardStateStyle}
        backgroundColorOverride={backgroundColorOverride}
      >
        <CardContentResolver {...resolverProps} />
      </CardFrame>

      {showCorrectionInputs && correction && process.env.NODE_ENV !== "test" ? (
        <CardMeasure
          correctionAwers={correctionAwers}
          correctionRewers={correctionRewers}
          correctionInput1={correction.input1}
          correctionInput2={correction.input2 ?? ""}
          answerOnly={effectiveAnswerOnly}
          setInput1ExpectedWidth={setInput1ExpectedWidth}
          setInput2ExpectedWidth={setInput2ExpectedWidth}
          setInput1TextWidth={setInput1TextWidth}
          setInput2TextWidth={setInput2TextWidth}
          input1ExpectedWidth={input1ExpectedWidth}
          input2ExpectedWidth={input2ExpectedWidth}
          input1TextWidth={input1TextWidth}
          input2TextWidth={input2TextWidth}
        />
      ) : null}

      {/*
        Actions (True/False, Download/OK) are now rendered outside Card
        from FlashcardsScreen via FlashcardsButtons.
      */}
    </View>
  );
}
