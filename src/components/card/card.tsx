import { Platform, Text, TextInput, View } from "react-native";
import { useStyles } from "./card-styles";
import MyButton from "../button/button";
import { WordWithTranslations } from "@/src/types/boxes";
import { useCallback, useEffect, useRef, useState } from "react";
import AntDesign from "@expo/vector-icons/AntDesign";
import { useSettings } from "@/src/contexts/SettingsContext";
import { stripDiacritics } from "@/src/utils/diacritics";

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

  const [translations, setTranslations] = useState<number>(0);
  const mainInputRef = useRef<TextInput | null>(null);
  const correctionInput1Ref = useRef<TextInput | null>(null);
  const correctionInput2Ref = useRef<TextInput | null>(null);
  const previousResult = useRef<boolean | null>(null);
  const previousIntroMode = useRef<boolean>(false);
  const previousSelectedId = useRef<number | null>(null);
  const needsCorrectionFocus = useRef<boolean>(false);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const previousCorrectionInput2 = useRef<string>("");

  const awers = selectedItem?.text ?? "";
  const rewers = selectedItem?.translations?.[translations] ?? "";
  const promptText = reversed ? rewers : awers;

  const len = selectedItem?.translations?.length ?? 0;
  const prev = () => len && setTranslations((i) => (i - 1 + len) % len);
  const next = () => len && setTranslations((i) => (i + 1) % len);

  const focusWithDelay = useCallback((ref: React.RefObject<TextInput | null>) => {
    const timeoutId = setTimeout(() => {
      ref.current?.focus();
      timeouts.current = timeouts.current.filter((id) => id !== timeoutId);
    }, 50);
    timeouts.current.push(timeoutId);
  }, []);

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

  function isCharMismatchAt(value: string, expected: string, index: number): boolean {
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
      const charStyle = mismatch ? styles.overlayCharError : styles.overlayCharNeutral;
      return (
        <Text
          key={`overlay-${idx}`}
          style={charStyle}
        >
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
                onChangeText={(t) => {
                  wrongInputChange(1, t);
                  if (isIntroMode && correction.awers) {
                    const normalizeString = (value: string) => {
                      let base = value.toLowerCase();
                      if (ignoreDiacriticsInSpellcheck) {
                        base = stripDiacritics(base);
                      }
                      return base;
                    };
                    if (
                      normalizeString(t) === normalizeString(correction.awers) &&
                      t.length === correction.awers.length
                    ) {
                      focusWithDelay(correctionInput2Ref);
                    }
                  }
                }}
                style={styles.myinput}
                ref={correctionInput1Ref}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => focusWithDelay(correctionInput2Ref)}
                autoCapitalize="none"
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
                  Platform.OS === "android" && previousValue.length === 1 && t === "";
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
                if (nativeEvent.key === "Backspace" && correction.input2.length <= 1) {
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
            {promptText === rewers && selectedItem.translations.length > 1 ? (
              <AntDesign
                style={styles.miniArrow}
                onPress={prev}
                name="caret-left"
                size={16}
              />
            ) : null}
            <Text style={styles.cardFont}>{promptText}</Text>
            {promptText === rewers && selectedItem.translations.length > 1 ? (
              <AntDesign
                style={styles.miniArrow}
                onPress={next}
                name="caret-right"
                size={16}
              />
            ) : null}
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
          />
        </>
      );
    }
    return <Text style={styles.cardFont}>Wybierz pudełko z słowkami</Text>;
  }

  const cardContainerStyle = [styles.card, isIntroMode ? styles.cardIntro : statusStyle];

  return (
    <View style={styles.container}>
      <View style={cardContainerStyle}>{showCardContent()}</View>

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
