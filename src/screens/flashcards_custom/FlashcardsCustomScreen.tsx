import { Text, View, TouchableOpacity } from "react-native";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  getCustomFlashcards,
  getCustomProfileById,
  scheduleCustomReview,
} from "@/src/db/sqlite/db";
import { useStyles } from "../flashcards/FlashcardsScreen-styles";
import { useSettings } from "@/src/contexts/SettingsContext";
import Boxes from "@/src/components/box/boxes";
import Card from "@/src/components/card/card";
import { WordWithTranslations } from "@/src/types/boxes";
import useSpellchecking from "@/src/hooks/useSpellchecking";
import { useRouter } from "expo-router";
import { useBoxesPersistenceSnapshot } from "@/src/hooks/useBoxesPersistenceSnapshot";
import BoxesCarousel from "@/src/components/box/boxcarousel";
import { useStreak } from "@/src/contexts/StreakContext";
import { useIsFocused } from "@react-navigation/native";
import { getProfileIconById } from "@/src/constants/customProfile";
import { DEFAULT_FLASHCARDS_BATCH_SIZE } from "@/src/config/appConfig";
import { useFlashcardsInteraction } from "@/src/hooks/useFlashcardsInteraction";
import type {
  CustomFlashcardRecord,
  CustomProfileRecord,
} from "@/src/db/sqlite/db";
import Confetti from "@/src/components/confetti/Confetti";

function mapCustomCardToWord(
  card: CustomFlashcardRecord
): WordWithTranslations {
  const front = card.frontText?.trim() ?? "";
  const normalizedAnswers = (card.answers ?? [])
    .map((answer) => answer.trim())
    .filter((answer) => answer.length > 0);

  const uniqueAnswers: string[] = [];
  for (const answer of normalizedAnswers) {
    if (!uniqueAnswers.includes(answer)) {
      uniqueAnswers.push(answer);
    }
  }

  const rawBack = card.backText ?? "";
  const fallback = rawBack
    .split(/[;,\n]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const defaultTranslation = rawBack.trim();
  const translations =
    uniqueAnswers.length > 0
      ? uniqueAnswers
      : fallback.length > 0
      ? fallback
      : [defaultTranslation];

  return {
    id: card.id,
    text: front,
    translations,
  };
}
// import MediumBoxes from "@/src/components/box/mediumboxes";
export default function Flashcards() {
  const router = useRouter();
  const styles = useStyles();
  const { activeCustomProfileId, boxesLayout, flashcardsBatchSize } =
    useSettings();
  const { registerLearningEvent } = useStreak();
  const isFocused = useIsFocused();
  const [shouldCelebrate, setShouldCelebrate] = useState(false);

  useEffect(() => {
    if (!shouldCelebrate) return;
    const timeout = setTimeout(() => setShouldCelebrate(false), 1750);
    return () => clearTimeout(timeout);
  }, [shouldCelebrate]);

  const { boxes, setBoxes, isReady, addUsedWordIds } =
    useBoxesPersistenceSnapshot({
      sourceLangId: activeCustomProfileId ?? 0,
      targetLangId: activeCustomProfileId ?? 0,
      level: `custom-${activeCustomProfileId ?? 0}`,
      storageNamespace: "customBoxes",
      autosave: activeCustomProfileId != null,
      saveDelayMs: 0,
    });

  const [customProfile, setCustomProfile] =
    useState<CustomProfileRecord | null>(null);
  const checkSpelling = useSpellchecking();
  const {
    activeBox,
    handleSelectBox,
    selectedItem,
    answer,
    setAnswer,
    result,
    setResult,
    confirm,
    reversed,
    correction,
    wrongInputChange,
    learned,
    setLearned,
    resetInteractionState,
    clearSelection,
  } = useFlashcardsInteraction({
    boxes,
    setBoxes,
    checkSpelling,
    addUsedWordIds,
    registerLearningEvent,
    onWordPromotedOut: (word) => {
      if (activeCustomProfileId != null && customProfile?.reviewsEnabled) {
        void scheduleCustomReview(word.id, activeCustomProfileId, 0);
      }
    },
    onCorrectAnswer: (boxKey) => {
      if (boxKey !== "boxFive") return;
      setShouldCelebrate(false);
      requestAnimationFrame(() => {
        setShouldCelebrate(true);
      });
    },
  });
  const [customCards, setCustomCards] = useState<WordWithTranslations[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const totalCards = customCards.length;
  const learnedPercent = totalCards > 0 ? learned.length / totalCards : 0;
  const trackedIds = useMemo(() => {
    const ids = new Set<number>();
    for (const list of Object.values(boxes)) {
      for (const item of list) ids.add(item.id);
    }
    for (const item of learned) ids.add(item.id);
    return ids;
  }, [boxes, learned]);
  const allCardsDistributed = totalCards > 0 && trackedIds.size >= totalCards;
  const totalCardsInBoxes = useMemo(() => {
    return (
      boxes.boxOne.length +
      boxes.boxTwo.length +
      boxes.boxThree.length +
      boxes.boxFour.length +
      boxes.boxFive.length
    );
  }, [boxes]);

  async function downloadData(): Promise<void> {
    if (!customCards.length) return;

    const existingIds = new Set<number>();
    for (const list of Object.values(boxes)) {
      for (const item of list) existingIds.add(item.id);
    }
    for (const item of learned) existingIds.add(item.id);

    const remaining = customCards.filter((card) => !existingIds.has(card.id));
    if (remaining.length === 0) return;

    const batchSize = flashcardsBatchSize ?? DEFAULT_FLASHCARDS_BATCH_SIZE;
    const nextBatch = remaining.slice(0, Math.max(1, batchSize));

    setBoxes((prev) => ({
      ...prev,
      boxOne: [...prev.boxOne, ...nextBatch],
    }));
    addUsedWordIds(nextBatch.map((card) => card.id));
  }

  useEffect(() => {
    if (!isFocused) return;

    let isMounted = true;

    if (activeCustomProfileId == null) {
      setCustomProfile(null);
      setCustomCards([]);
      setLoadError(null);
      setIsLoadingData(false);
      return () => {
        isMounted = false;
      };
    }

    setIsLoadingData(true);
    setLoadError(null);

    void Promise.all([
      getCustomProfileById(activeCustomProfileId),
      getCustomFlashcards(activeCustomProfileId),
    ])
      .then(([profileRow, flashcardRows]) => {
        if (!isMounted) return;
        if (!profileRow) {
          setCustomProfile(null);
          setCustomCards([]);
          setLoadError("Wybrany profil nie istnieje.");
          return;
        }
        setCustomProfile(profileRow);
        const mapped = flashcardRows.map(mapCustomCardToWord);
        setCustomCards(mapped);
      })
      .catch((error) => {
        console.error("Failed to load custom flashcards", error);
        if (!isMounted) return;
        setCustomProfile(null);
        setCustomCards([]);
        setLoadError("Nie udało się wczytać fiszek.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingData(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeCustomProfileId, isFocused]);

  useEffect(() => {
    if (!isReady) return;
    const allowedIds = new Set(customCards.map((card) => card.id));

    setBoxes((prev) => {
      let mutated = false;
      const sanitize = (list: WordWithTranslations[]) => {
        const filtered = list.filter((item) => allowedIds.has(item.id));
        if (filtered.length !== list.length) mutated = true;
        return filtered;
      };

      const next = {
        boxOne: sanitize(prev.boxOne),
        boxTwo: sanitize(prev.boxTwo),
        boxThree: sanitize(prev.boxThree),
        boxFour: sanitize(prev.boxFour),
        boxFive: sanitize(prev.boxFive),
      };
      return mutated ? next : prev;
    });

    setLearned((current) => {
      const filtered = current.filter((card) => allowedIds.has(card.id));
      return filtered.length === current.length ? current : filtered;
    });
  }, [customCards, isReady, learned, setBoxes, setLearned]);

  useEffect(() => {
    if (!isReady) return;
    if (isLoadingData) return;
    if (activeCustomProfileId == null) return;
    if (totalCardsInBoxes > 0) return;
    if (allCardsDistributed) return;
    if (!customCards.length) return;

    void downloadData();
  }, [
    isReady,
    isLoadingData,
    activeCustomProfileId,
    totalCardsInBoxes,
    allCardsDistributed,
    customCards,
  ]);

  useEffect(() => {
    if (selectedItem && !customCards.some((card) => card.id === selectedItem.id)) {
      clearSelection();
    }
  }, [clearSelection, customCards, selectedItem]);

  const profileAccessibilityLabel = customProfile
    ? `Profil ${customProfile.name}. Otwórz panel profili.`
    : "Wybierz profil fiszek.";

  const editAccessibilityLabel = customProfile
    ? `Edytuj fiszki profilu ${customProfile.name}.`
    : "Dodaj fiszki do profilu.";

  const profileIconMeta = useMemo(() => {
    if (!customProfile) return null;
    return getProfileIconById(customProfile.iconId);
  }, [customProfile]);
  const ProfileIconComponent = profileIconMeta?.Component;
  const profileIconName = profileIconMeta?.name ?? "";
  const profileIconColor = customProfile?.iconColor ?? "#00214D";
  const profileName = customProfile?.name ?? "Wybierz profil";
  const totalCardsLabel = customCards.length > 0
    ? `Fiszki: ${customCards.length}`
    : "Brak fiszek";
  const downloadDisabled =
    customCards.length === 0 || allCardsDistributed || isLoadingData || !isReady;
  const shouldShowBoxes =
    activeCustomProfileId != null &&
    isReady &&
    !isLoadingData &&
    !loadError &&
    customCards.length > 0;

  useEffect(() => {
    resetInteractionState();
  }, [activeCustomProfileId, resetInteractionState]);

  const handleEditPress = () => {
    if (!customProfile || activeCustomProfileId == null) return;
    const encodedName = encodeURIComponent(customProfile.name);
    router.push(
      `/custom_profile/edit?id=${activeCustomProfileId.toString()}&name=${encodedName}`
    );
  };

  let cardSection: ReactNode;
  if (activeCustomProfileId == null) {
    cardSection = (
      <View style={{ paddingHorizontal: 32 }}>
        <Text allowFontScaling>
          Wybierz własny profil w panelu profili, aby rozpocząć naukę.
        </Text>
      </View>
    );
  } else if (isLoadingData) {
    cardSection = (
      <View style={{ paddingHorizontal: 32 }}>
        <Text allowFontScaling>Ładowanie fiszek...</Text>
      </View>
    );
  } else if (loadError) {
    cardSection = (
      <View style={{ paddingHorizontal: 32 }}>
        <Text allowFontScaling>{loadError}</Text>
      </View>
    );
  } else if (!customCards.length) {
    cardSection = (
      <View style={{ paddingHorizontal: 32 }}>
        <Text allowFontScaling>
          Dodaj fiszki do tego profilu, aby móc z nich korzystać.
        </Text>
      </View>
    );
  } else {
    cardSection = (
      <Card
        selectedItem={selectedItem}
        setAnswer={setAnswer}
        answer={answer}
        result={result}
        confirm={confirm}
        reversed={reversed}
        setResult={setResult}
        correction={correction}
        wrongInputChange={wrongInputChange}
        onDownload={downloadData}
        downloadDisabled={downloadDisabled}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Confetti generateConfetti={shouldCelebrate} />
      <TouchableOpacity
        onPress={() => router.push("/profilpanel")}
        style={styles.containerofprofile}
        accessibilityRole="button"
        accessibilityLabel={profileAccessibilityLabel}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {ProfileIconComponent ? (
            <ProfileIconComponent
              name={profileIconName as never}
              size={32}
              color={profileIconColor}
            />
          ) : null}
          <Text
            style={[
              styles.levelLabel,
              { marginLeft: ProfileIconComponent ? 8 : 0 },
            ]}
            allowFontScaling
          >
            {profileName}
          </Text>
        </View>
      </TouchableOpacity>

      {/* <TouchableOpacity
        onPress={handleEditPress}
        style={[
          styles.containeroflevel,
          !customProfile && { opacity: 0.4 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={editAccessibilityLabel}
        disabled={!customProfile}
      >
        <View style={styles.levelContainer}>
          <Text style={styles.levelLabel} allowFontScaling>
            {totalCardsLabel}
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${learnedPercent * 100}%` },
              ]}
            />
          </View>
        </View>
      </TouchableOpacity> */}

      {cardSection}

      {shouldShowBoxes ? (
        boxesLayout === "classic" ? (
          <Boxes
            boxes={boxes}
            activeBox={activeBox}
            handleSelectBox={handleSelectBox}
          />
        ) : (
          <BoxesCarousel
            boxes={boxes}
            activeBox={activeBox}
            handleSelectBox={handleSelectBox}
          />
        )
      ) : null}
    </View>
  );
}
