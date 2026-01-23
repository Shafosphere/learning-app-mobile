import { HangulKeyboardOverlay } from "@/src/components/hangul/HangulKeyboardOverlay";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useAchievements } from "@/src/hooks/useAchievements";
import { stripDiacritics } from "@/src/utils/diacritics";
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
import type { CardProps } from "./card-types";
import { CardActions } from "./subcomponents/CardActions";
import { CardContentResolver } from "./subcomponents/CardContentResolver";
import { CardHint } from "./subcomponents/CardHint";
import { CardMeasure } from "./subcomponents/CardMeasure";
import LargeCardContainer from "./subcomponents/LargeCardContainer";

const HANGUL_CHAR_REGEX = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
const INPUT_HORIZONTAL_PADDING = 8;
const INPUT_SCROLL_AHEAD = 48; // keep ~2-3 letters visible ahead of the caret

export default function Card({
  selectedItem,
  reversed = false,
  answer,
  setAnswer,
  result,
  confirm,
  correction,
  wrongInputChange,
  onDownload,
  downloadDisabled = false,
  introMode = false,
  setCorrectionRewers,
  onHintUpdate,
  hideActions = false,
  isFocused = true,
  backgroundColorOverride,
  textColorOverride,
}: CardProps) {
  const styles = useStyles();
  const {
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
  const handleAnswerChange = useCallback(
    (value: string) => {
      setAnswer(value);
    },
    [setAnswer],
  );
  const [isMainInputFocused, setIsMainInputFocused] = useState(false);
  const [isCorrectionInput1Focused, setIsCorrectionInput1Focused] =
    useState(false);
  const [hangulTarget, setHangulTarget] = useState<
    "main" | "correction1" | null
  >(null);
  const noopTextChange = useCallback((_: string) => {}, []);
  const noopTrueFalseAnswer = useCallback((_: boolean) => {}, []);

  const [translations, setTranslations] = useState<number>(0);
  const mainInputRef = useRef<TextInput | null>(null);
  const correctionInput1Ref = useRef<TextInput | null>(null);
  const correctionInput2Ref = useRef<TextInput | null>(null);
  const previousResult = useRef<boolean | null>(null);
  const previousIntroMode = useRef<boolean>(false);
  const previousSelectedId = useRef<number | null>(null);
  const lastTranslationItemId = useRef<number | null>(null);
  const lastCorrectionFocusedId = useRef<number | null>(null);
  const needsCorrectionFocus = useRef<boolean>(false);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const previousCorrectionInput2 = useRef<string>("");
  const [input1LayoutWidth, setInput1LayoutWidth] = useState(0);
  const [input2LayoutWidth, setInput2LayoutWidth] = useState(0);
  const [input1TextWidth, setInput1TextWidth] = useState(0);
  const [input2TextWidth, setInput2TextWidth] = useState(0);
  const [input1ExpectedWidth, setInput1ExpectedWidth] = useState(0);
  const [input2ExpectedWidth, setInput2ExpectedWidth] = useState(0);
  const input1ScrollRef = useRef<ScrollView | null>(null);
  const input2ScrollRef = useRef<ScrollView | null>(null);

  const awers = selectedItem?.text ?? "";
  const rewers = selectedItem?.translations?.[translations] ?? "";
  const promptImageFront = selectedItem?.imageFront ?? null;
  const promptImageBack = selectedItem?.imageBack ?? null;
  const hasTextPrompt = Boolean(awers.trim());
  const hasImagePrompt = Boolean(promptImageFront || promptImageBack);
  const type = selectedItem?.type ?? "text";
  const answerOnly =
    (selectedItem?.answerOnly ?? false) ||
    (!hasTextPrompt && hasImagePrompt) ||
    type === "true_false";

  // Force answerOnly logic: if true, card can only be shown Front -> Back
  const effectiveReversed = answerOnly ? false : reversed;

  const promptImageUri = selectedItem
    ? effectiveReversed
      ? promptImageBack
      : promptImageFront
    : null;
  const promptText = effectiveReversed ? rewers : awers;
  const correctionAwers = correction?.awers ?? awers;
  const correctionRewers = isIntroMode ? rewers : (correction?.rewers ?? "");
  const shouldCorrectAwers = effectiveReversed;
  const shouldCorrectRewers = !effectiveReversed || answerOnly;

  const expectsHangulAnswer = useMemo(() => {
    if (!effectiveReversed) return false;
    const expected = selectedItem?.text ?? "";
    return HANGUL_CHAR_REGEX.test(expected);
  }, [effectiveReversed, selectedItem?.text]);

  const expectsHangulCorrectionAwers = useMemo(() => {
    const value = correction?.awers ?? "";
    if (!value) return false;
    return HANGUL_CHAR_REGEX.test(value);
  }, [correction?.awers]);
  const shouldUseHangulKeyboardMain = expectsHangulAnswer;
  const shouldUseHangulKeyboardCorrection1 = expectsHangulCorrectionAwers;
  const showMainHangulKeyboard =
    hangulTarget === "main" &&
    shouldUseHangulKeyboardMain &&
    isMainInputFocused;
  const showCorrectionHangulKeyboard =
    !answerOnly &&
    hangulTarget === "correction1" &&
    shouldUseHangulKeyboardCorrection1 &&
    isCorrectionInput1Focused;
  const showHangulKeyboard =
    showMainHangulKeyboard || showCorrectionHangulKeyboard;
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
  const showCorrectionInputs = Boolean(
    correction && (result === false || isIntroMode),
  );

  // Decide if we should use large layout: either global setting OR image is present
  const useLargeLayout = flashcardsCardSize === "large" || hasImagePrompt;
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

  const correctionPrimaryRef =
    shouldCorrectAwers && correctionInput1Ref
      ? correctionInput1Ref
      : correctionInput2Ref;

  const len = selectedItem?.translations?.length ?? 0;
  const isShowingTranslation = isIntroMode || promptText === rewers;
  const canToggleTranslations = isShowingTranslation && len > 1;
  const next = () => {
    if (!len) return;
    setTranslations((i) => (i + 1) % len);
  };

  useLayoutEffect(() => {
    const currentId = selectedItem?.id ?? null;
    if (!isFocused) {
      return;
    }
    if (currentId === lastTranslationItemId.current) {
      return;
    }

    lastTranslationItemId.current = currentId;
    setTranslations((prev) => (prev === 0 ? prev : 0));
  }, [isFocused, selectedItem?.id]);

  useEffect(() => {
    if (!isIntroMode || !setCorrectionRewers) return;
    const nextTranslation = selectedItem?.translations?.[translations] ?? "";
    setCorrectionRewers(nextTranslation);
  }, [
    isIntroMode,
    selectedItem?.translations,
    setCorrectionRewers,
    translations,
  ]);

  const focusWithDelay = useCallback(
    (ref: React.RefObject<TextInput | null>, delay = 50) => {
      const timeoutId = setTimeout(() => {
        ref.current?.focus();
        timeouts.current = timeouts.current.filter((id) => id !== timeoutId);
      }, delay);
      timeouts.current.push(timeoutId);
    },
    [],
  );

  const handleCorrectionInput1Change = useCallback(
    (t: string) => {
      wrongInputChange(1, t);
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
          setHangulTarget(null);
          setIsCorrectionInput1Focused(false);
          correctionInput1Ref.current?.blur();
          const delay = shouldUseHangulKeyboardCorrection1 ? 200 : 50;
          focusWithDelay(correctionInput2Ref, delay);
        }
      }
    },
    [
      correction?.awers,
      focusWithDelay,
      ignoreDiacriticsInSpellcheck,
      wrongInputChange,
      setHangulTarget,
      setIsCorrectionInput1Focused,
      shouldUseHangulKeyboardCorrection1,
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

  const hangulOverlayConfig = useMemo(() => {
    if (showMainHangulKeyboard) {
      return {
        value: answer,
        onChangeText: handleAnswerChange,
        onSubmit: handleConfirm,
      };
    }
    if (showCorrectionHangulKeyboard && correction) {
      return {
        value: correction.input1,
        onChangeText: handleCorrectionInput1Change,
        onSubmit: () => {
          setHangulTarget(null);
          setIsCorrectionInput1Focused(false);
          correctionInput1Ref.current?.blur();
          const delay = shouldUseHangulKeyboardCorrection1 ? 200 : 50;
          focusWithDelay(correctionInput2Ref, delay);
        },
      };
    }
    return null;
  }, [
    showMainHangulKeyboard,
    answer,
    handleAnswerChange,
    handleConfirm,
    showCorrectionHangulKeyboard,
    correction,
    handleCorrectionInput1Change,
    focusWithDelay,
    setHangulTarget,
    setIsCorrectionInput1Focused,
    shouldUseHangulKeyboardCorrection1,
  ]);

  useEffect(() => {
    return () => {
      timeouts.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeouts.current = [];
    };
  }, []);

  useEffect(() => {
    const movedToCorrection =
      result === false && previousResult.current !== false;
    const backToMain = result !== false && previousResult.current === false;

    if (movedToCorrection) {
      needsCorrectionFocus.current = true;
      if (correction) {
        focusWithDelay(correctionPrimaryRef);
        needsCorrectionFocus.current = false;
      }
    }

    if (backToMain && !isIntroMode) {
      needsCorrectionFocus.current = false;
      setAnswer("");
      if (selectedItem) {
        focusWithDelay(mainInputRef);
      }
    }

    if (isIntroMode && !previousIntroMode.current && correction) {
      focusWithDelay(correctionPrimaryRef);
      needsCorrectionFocus.current = false;
    }

    if (!isIntroMode && previousIntroMode.current && result !== false) {
      if (selectedItem) {
        focusWithDelay(mainInputRef);
      }
    }

    previousResult.current = result;
    previousIntroMode.current = isIntroMode;
  }, [
    correction,
    focusWithDelay,
    isIntroMode,
    result,
    selectedItem,
    setAnswer,
    answerOnly,
    type,
    showCorrectionInputs,
    correctionPrimaryRef,
  ]);

  // Achievements integration
  const { reportResult } = useAchievements();
  useEffect(() => {
    if (result === true) {
      reportResult(true);
    } else if (result === false) {
      reportResult(false);
    }
  }, [result, reportResult]);

  useEffect(() => {
    if (correction && (result === false || isIntroMode)) {
      const hasFocusedThisCorrection =
        lastCorrectionFocusedId.current === correction.cardId;
      if (needsCorrectionFocus.current || !hasFocusedThisCorrection) {
        focusWithDelay(correctionPrimaryRef);
        needsCorrectionFocus.current = false;
        lastCorrectionFocusedId.current = correction.cardId ?? null;
      }
    }
  }, [
    correction,
    isIntroMode,
    result,
    focusWithDelay,
    answerOnly,
    correctionPrimaryRef,
  ]);

  useEffect(() => {
    const currentId = selectedItem?.id ?? null;
    if (currentId !== previousSelectedId.current) {
      if (currentId != null) {
        if (isIntroMode) {
          focusWithDelay(correctionPrimaryRef);
          needsCorrectionFocus.current = false;
        } else if (result !== false) {
          focusWithDelay(mainInputRef);
        }
      }
      previousSelectedId.current = currentId;
    }
  }, [
    isIntroMode,
    selectedItem,
    result,
    focusWithDelay,
    answerOnly,
    correctionPrimaryRef,
  ]);

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
  }, [currentHint, onHintUpdate, selectedItem]);

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
    [hintDraft, onHintUpdate, effectiveReversed, selectedItem],
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

  const resolverProps = {
    correction,
    result,
    isIntroMode,
    selectedItem,
    promptText,
    promptImageUri,
    promptImageSizeMode,
    correctionAwers,
    correctionRewers,
    answerOnly,
    shouldCorrectAwers,
    shouldCorrectRewers,
    useLargeLayout,
    correctionInput1Ref,
    correctionInput2Ref,
    input1ScrollRef,
    input2ScrollRef,
    handleCorrectionInput1Change,
    wrongInputChange,
    suggestionProps,
    renderOverlayText,
    input1ContentWidth,
    input2ContentWidth,
    setInput1LayoutWidth,
    setInput2LayoutWidth,
    focusWithDelay,
    setIsCorrectionInput1Focused,
    setHangulTarget,
    shouldUseHangulKeyboardCorrection1,
    previousCorrectionInput2,
    canToggleTranslations,
    next,
    input1LayoutWidth,
    input2LayoutWidth,
    noopTrueFalseAnswer,
    answer,
    handleAnswerChange,
    mainInputRef,
    handleConfirm,
    shouldUseHangulKeyboardMain,
    setIsMainInputFocused,
    hangulTarget,
    typoDiff,
  };

  const cardStateStyle = isIntroMode ? styles.cardIntro : statusStyle;
  const showCardActions = !(hideActions || selectedItem?.type === "true_false");

  const handleCloseHangulKeyboard = () => {
    const target = hangulTarget;
    setHangulTarget(null);
    if (target === "main") {
      setIsMainInputFocused(false);
      mainInputRef.current?.blur();
    } else if (target === "correction1") {
      setIsCorrectionInput1Focused(false);
      correctionInput1Ref.current?.blur();
    }
  };

  return (
    <View style={styles.container}>
      <CardHint
        currentHint={currentHint}
        isEditingHint={isEditingHint}
        hintDraft={hintDraft}
        setHintDraft={setHintDraft}
        startHintEditing={startHintEditing}
        cancelHintEditing={cancelHintEditing}
        finishHintEditing={finishHintEditing}
        hintActionsStyle={hintActionsStyle}
        shouldMarqueeHint={shouldMarqueeHint}
        selectedItem={selectedItem}
        onHintUpdate={onHintUpdate}
      />
      {useLargeLayout ? (
        <LargeCardContainer
          cardStateStyle={cardStateStyle}
          hasContent={Boolean(selectedItem)}
          showCorrectionInputs={showCorrectionInputs}
          backgroundColorOverride={backgroundColorOverride}
        >
          {(handlers) => (
            <CardContentResolver
              {...resolverProps}
              layoutHandlers={handlers}
              textColorOverride={textColorOverride}
            />
          )}
        </LargeCardContainer>
      ) : (
        <View
          style={[
            styles.card,
            styles.cardSmall,
            cardStateStyle,
            backgroundColorOverride
              ? { backgroundColor: backgroundColorOverride }
              : null,
          ]}
        >
          <View style={styles.cardSmallContent}>
            <CardContentResolver
              {...resolverProps}
              textColorOverride={textColorOverride}
            />
          </View>
        </View>
      )}
      <HangulKeyboardOverlay
        visible={showHangulKeyboard}
        value={hangulOverlayConfig?.value ?? ""}
        onChangeText={hangulOverlayConfig?.onChangeText ?? noopTextChange}
        onSubmit={hangulOverlayConfig?.onSubmit ?? handleConfirm}
        onRequestClose={handleCloseHangulKeyboard}
      />

      {showCorrectionInputs && correction ? (
        <CardMeasure
          correctionAwers={correctionAwers}
          correctionRewers={correctionRewers}
          correctionInput1={correction.input1}
          correctionInput2={correction.input2 ?? ""}
          answerOnly={answerOnly}
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

      <CardActions
        handleConfirm={handleConfirm}
        onDownload={onDownload}
        downloadDisabled={downloadDisabled}
        hidden={!showCardActions}
      />
    </View>
  );
}
