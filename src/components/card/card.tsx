import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { useStyles } from "./card-styles";
import MyButton from "../button/button";
import { WordWithTranslations } from "@/src/types/boxes";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Octicons from "@expo/vector-icons/Octicons";
import { useSettings } from "@/src/contexts/SettingsContext";
import { stripDiacritics } from "@/src/utils/diacritics";
import { HangulKeyboardOverlay } from "@/src/components/hangul/HangulKeyboardOverlay";

const HANGUL_CHAR_REGEX = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;

type CardProps = {
  selectedItem: WordWithTranslations | null;
  reversed?: boolean;
  answer: string;
  setAnswer: React.Dispatch<React.SetStateAction<string>>;
  setResult: React.Dispatch<React.SetStateAction<boolean | null>>;
  result: boolean | null;
  confirm: () => void;
  correction: {
    awers: string;
    rewers: string;
    input1: string;
    input2: string;
    mode?: "demote" | "intro";
  } | null;
  wrongInputChange: (which: 1 | 2, value: string) => void;
  onDownload: () => Promise<void>;
  downloadDisabled?: boolean;
  introMode?: boolean;
};

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
}: CardProps) {
  const styles = useStyles();
  const { ignoreDiacriticsInSpellcheck } = useSettings();
  const isIntroMode = Boolean(introMode && correction?.mode === "intro");
  const statusStyle =
    !isIntroMode && result !== null
      ? result
        ? styles.cardGood
        : styles.cardBad
      : undefined;
  const [isMainInputFocused, setIsMainInputFocused] = useState(false);
  const [isCorrectionInput1Focused, setIsCorrectionInput1Focused] =
    useState(false);
  const [hangulTarget, setHangulTarget] = useState<
    "main" | "correction1" | null
  >(null);
  const noopTextChange = useCallback((_: string) => {}, []);

  const [translations, setTranslations] = useState<number>(0);
  const mainInputRef = useRef<TextInput | null>(null);
  const correctionInput1Ref = useRef<TextInput | null>(null);
  const correctionInput2Ref = useRef<TextInput | null>(null);
  const previousResult = useRef<boolean | null>(null);
  const previousIntroMode = useRef<boolean>(false);
  const previousSelectedId = useRef<number | null>(null);
  const lastTranslationItemId = useRef<number | null>(null);
  const needsCorrectionFocus = useRef<boolean>(false);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const previousCorrectionInput2 = useRef<string>("");

  const awers = selectedItem?.text ?? "";
  const rewers = selectedItem?.translations?.[translations] ?? "";
  const promptText = reversed ? rewers : awers;
  const expectsHangulAnswer = useMemo(() => {
    if (!reversed) return false;
    const expected = selectedItem?.text ?? "";
    return HANGUL_CHAR_REGEX.test(expected);
  }, [reversed, selectedItem?.text]);
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
    hangulTarget === "correction1" &&
    shouldUseHangulKeyboardCorrection1 &&
    isCorrectionInput1Focused;
  const showHangulKeyboard =
    showMainHangulKeyboard || showCorrectionHangulKeyboard;

  useEffect(() => {
    console.log("[Card] reversed:", reversed, {
      expectsHangulAnswer,
      expectsHangulCorrectionAwers,
      hangulTarget,
      overlayVisible: showHangulKeyboard,
    });
  }, [
    reversed,
    expectsHangulAnswer,
    expectsHangulCorrectionAwers,
    hangulTarget,
    showHangulKeyboard,
  ]);

  const len = selectedItem?.translations?.length ?? 0;
  const canToggleTranslations = promptText === rewers && len > 1;
  const next = () => len && setTranslations((i) => (i + 1) % len);

  useLayoutEffect(() => {
    const currentId = selectedItem?.id ?? null;
    if (currentId === lastTranslationItemId.current) {
      return;
    }

    lastTranslationItemId.current = currentId;
    setTranslations(0);
  }, [selectedItem?.id]);

  const focusWithDelay = useCallback(
    (ref: React.RefObject<TextInput | null>, delay = 50) => {
      const timeoutId = setTimeout(() => {
        ref.current?.focus();
        timeouts.current = timeouts.current.filter((id) => id !== timeoutId);
      }, delay);
      timeouts.current.push(timeoutId);
    },
    []
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
          normalizeString(t) === normalizeString(correction.awers) &&
          t.length === correction.awers.length;
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
    ]
  );

  const hangulOverlayConfig = useMemo(() => {
    if (showMainHangulKeyboard) {
      return {
        value: answer,
        onChangeText: setAnswer,
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
    setAnswer,
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
        focusWithDelay(correctionInput1Ref);
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
      focusWithDelay(correctionInput1Ref);
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
  ]);

  useEffect(() => {
    if (
      correction &&
      needsCorrectionFocus.current &&
      (result === false || isIntroMode)
    ) {
      focusWithDelay(correctionInput1Ref);
      needsCorrectionFocus.current = false;
    }
  }, [correction, isIntroMode, result, focusWithDelay]);

  useEffect(() => {
    const currentId = selectedItem?.id ?? null;
    if (currentId !== previousSelectedId.current) {
      if (currentId != null) {
        if (isIntroMode) {
          focusWithDelay(correctionInput1Ref);
          needsCorrectionFocus.current = false;
        } else if (result !== false) {
          focusWithDelay(mainInputRef);
        }
      }
      previousSelectedId.current = currentId;
    }
  }, [isIntroMode, selectedItem, result, focusWithDelay]);

  useEffect(() => {
    previousCorrectionInput2.current = correction?.input2 ?? "";
  }, [correction?.input2]);

  function handleConfirm() {
    if (selectedItem?.translations && selectedItem.translations.length > 1) {
      const currentIndex = translations;
      if (currentIndex !== 0) {
        const arr = [...selectedItem.translations];
        const [chosen] = arr.splice(currentIndex, 1);
        arr.unshift(chosen);
        selectedItem.translations = arr;
      }
      setTranslations(0);
    }
    confirm();
  }

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
    index: number
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

  function showCardContent() {
    if (correction && (result === false || isIntroMode)) {
      return (
        <>
          <View style={styles.containerInput}>
            <Text style={styles.myplaceholder}>{correction.awers}</Text>
            <TextInput
              value={correction.input1}
              onChangeText={handleCorrectionInput1Change}
              style={styles.myinput}
              ref={correctionInput1Ref}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => focusWithDelay(correctionInput2Ref)}
              autoCapitalize="none"
              showSoftInputOnFocus={!shouldUseHangulKeyboardCorrection1}
              onFocus={() => {
                setIsCorrectionInput1Focused(true);
                setHangulTarget("correction1");
              }}
              onBlur={() => {
                setIsCorrectionInput1Focused(false);
                if (hangulTarget === "correction1") {
                  setHangulTarget(null);
                }
              }}
            />
            {isIntroMode ? (
              <Text style={styles.inputOverlay}>
                {renderOverlayText(correction.input1, correction.awers)}
              </Text>
            ) : null}
          </View>
          <View style={styles.containerInput}>
            <Text style={styles.myplaceholder}>{correction.rewers}</Text>
            <TextInput
              value={correction.input2}
              onChangeText={(t) => {
                const previousValue = previousCorrectionInput2.current;
                const shouldFocusPrevious =
                  Platform.OS === "android" &&
                  previousValue.length === 1 &&
                  t === "";
                previousCorrectionInput2.current = t;
                wrongInputChange(2, t);
                if (shouldFocusPrevious) {
                  focusWithDelay(correctionInput1Ref);
                }
              }}
              style={styles.myinput}
              ref={correctionInput2Ref}
              returnKeyType="done"
              autoCapitalize="none"
              onKeyPress={({ nativeEvent }) => {
                if (
                  nativeEvent.key === "Backspace" &&
                  correction.input2.length <= 1
                ) {
                  focusWithDelay(correctionInput1Ref);
                }
              }}
            />
            {isIntroMode ? (
              <Text style={styles.inputOverlay}>
                {renderOverlayText(correction.input2, correction.rewers)}
              </Text>
            ) : null}
          </View>
        </>
      );
    }
    if (selectedItem && selectedItem.text) {
      return (
        <>
          <View style={styles.topContainer}>
            {/* <View style={styles.cardIconPlaceholder} /> */}
            <Text style={[styles.cardFont, styles.promptText]}>
              {promptText}
            </Text>
            {canToggleTranslations ? (
              <Pressable
                style={styles.cardIconWrapper}
                onPress={next}
                hitSlop={8}
              >
                <Octicons
                  name="discussion-duplicate"
                  size={24}
                  color={styles.cardFont.color}
                />
              </Pressable>
            ) : (
              <View style={styles.cardIconPlaceholder} />
            )}
          </View>

          <TextInput
            style={[styles.cardInput, styles.cardFont]}
            value={answer}
            onChangeText={setAnswer}
            autoCapitalize="none"
            ref={mainInputRef}
            returnKeyType="done"
            blurOnSubmit={false}
            onSubmitEditing={handleConfirm}
            showSoftInputOnFocus={!shouldUseHangulKeyboardMain}
            onFocus={() => {
              setIsMainInputFocused(true);
              setHangulTarget("main");
            }}
            onBlur={() => {
              setIsMainInputFocused(false);
              if (hangulTarget === "main") {
                setHangulTarget(null);
              }
            }}
          />
        </>
      );
    }
    return <Text style={styles.empty}>Wybierz pudełko z słowkami</Text>;
  }

  const cardContainerStyle = [
    styles.card,
    isIntroMode ? styles.cardIntro : statusStyle,
  ];

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
      <View style={cardContainerStyle}>{showCardContent()}</View>
      <HangulKeyboardOverlay
        visible={showHangulKeyboard}
        value={hangulOverlayConfig?.value ?? ""}
        onChangeText={hangulOverlayConfig?.onChangeText ?? noopTextChange}
        onSubmit={hangulOverlayConfig?.onSubmit ?? handleConfirm}
        onRequestClose={handleCloseHangulKeyboard}
      />

      <View style={styles.containerButton}>
        <MyButton
          text="zatwiedź"
          color="my_green"
          disabled={false}
          onPress={handleConfirm}
        />
        <MyButton
          text="dodaj    słówka"
          color="my_yellow"
          onPress={onDownload}
          disabled={downloadDisabled}
        />
      </View>
    </View>
  );
}
