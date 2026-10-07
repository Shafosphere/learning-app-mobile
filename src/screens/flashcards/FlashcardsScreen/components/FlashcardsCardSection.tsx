import Card from "@/src/components/card/card";
import type { CardProps } from "@/src/components/card/card-types";
import { CourseFinishedPanel } from "@/src/components/flashcards/CourseFinishedPanel/CourseFinishedPanel";
import { FlashcardsPlaceholderCard } from "@/src/components/flashcards/FlashcardsPlaceholderCard";
import type { WordWithTranslations } from "@/src/types/boxes";
import type { TFunction } from "i18next";
import type { ComponentProps } from "react";
import { View } from "react-native";
import { useStableFlashcardPresentation } from "../hooks/useStableFlashcardPresentation";

const ignoreHeldCardAction = () => {};

type CourseFinishedPanelProps = ComponentProps<typeof CourseFinishedPanel>;

type FlashcardsCardSectionProps = {
  holdContent?: boolean;
  activeCustomCourseId: number | null;
  loadError: string | null;
  customCards: WordWithTranslations[];
  customCourse: { name?: string | null } | null;
  isCourseFinishedVisible: boolean;
  courseFinishedFlagSource: CourseFinishedPanelProps["courseFlagSource"];
  courseFinishedIconProps: CourseFinishedPanelProps["courseIconProps"];
  courseFinishedAccuracyLabel: string;
  courseFinishedTimeLabel: string;
  onBackToCourses: () => void;
  onEditCard: (cardId: number) => void;
  t: TFunction;
} & Pick<
  CardProps,
  | "activeBox"
  | "inlineAction"
  | "keyboardBridgeInputRef"
  | "selectedItem"
  | "setAnswer"
  | "answer"
  | "emptyAnswerSubmitWarning"
  | "confirm"
  | "reversed"
  | "setResult"
  | "correction"
  | "wrongInputChange"
  | "setCorrectionRewers"
  | "onHintUpdate"
  | "shouldStartHintEditing"
  | "hintEditRequestToken"
  | "focusRequestToken"
  | "isBetweenCards"
  | "skipCorrectionEnabled"
  | "autoSubmitCorrectAnswer"
  | "hideHints"
  | "reserveHintSpaceWhenHidden"
  | "showExplanationEnabled"
  | "explanationOnlyOnWrong"
> & {
  displayResult: CardProps["result"];
  introModeActive: CardProps["introMode"];
  isCardFocusEnabled: boolean;
  shouldDisableTutorialCardAutofocus: boolean;
  shouldKeepLoadingOverlayVisible: boolean;
  showLoadingOverlay: boolean;
};

export function FlashcardsCardSection({
  holdContent = false,
  activeCustomCourseId,
  loadError,
  customCards,
  customCourse,
  isCourseFinishedVisible,
  courseFinishedFlagSource,
  courseFinishedIconProps,
  courseFinishedAccuracyLabel,
  courseFinishedTimeLabel,
  onBackToCourses,
  onEditCard,
  t,
  activeBox,
  inlineAction,
  keyboardBridgeInputRef,
  selectedItem,
  setAnswer,
  answer,
  emptyAnswerSubmitWarning,
  displayResult,
  confirm,
  reversed,
  setResult,
  correction,
  wrongInputChange,
  setCorrectionRewers,
  introModeActive,
  onHintUpdate,
  shouldStartHintEditing,
  hintEditRequestToken,
  isCardFocusEnabled,
  shouldDisableTutorialCardAutofocus,
  focusRequestToken,
  isBetweenCards,
  shouldKeepLoadingOverlayVisible,
  showLoadingOverlay,
  skipCorrectionEnabled,
  autoSubmitCorrectAnswer,
  hideHints,
  reserveHintSpaceWhenHidden,
  showExplanationEnabled,
  explanationOnlyOnWrong,
}: FlashcardsCardSectionProps) {
  const { cardProps, isHeld } = useStableFlashcardPresentation({
    activeBox,
    contentDebugSource: "flashcards",
    keyboardBridgeInputRef,
    inlineAction,
    coachmarkId: "flashcards-card-section",
    selectedItem,
    setAnswer,
    answer,
    emptyAnswerSubmitWarning,
    result: displayResult,
    confirm,
    reversed,
    setResult,
    correction,
    wrongInputChange,
    setCorrectionRewers,
    introMode: introModeActive,
    onHintUpdate,
    hintCoachmarkId: "flashcards-hint-section",
    shouldStartHintEditing,
    hintEditRequestToken,
    isFocused: isCardFocusEnabled && !shouldDisableTutorialCardAutofocus,
    focusRequestToken,
    isBetweenCards,
    disableLayoutAnimation: shouldKeepLoadingOverlayVisible || showLoadingOverlay,
    skipCorrectionEnabled,
    autoSubmitCorrectAnswer,
    hideHints,
    reserveHintSpaceWhenHidden,
    showExplanationEnabled,
    explanationOnlyOnWrong,
    onEdit: selectedItem ? () => onEditCard(selectedItem.id) : undefined,
  }, holdContent, activeCustomCourseId);

  if (activeCustomCourseId == null) {
    return (
      <FlashcardsPlaceholderCard
        title={t("screens.flashcards.flashcards.flashcards.title.brakWybranegoKursu")}
        description="Wybierz własny kurs w panelu kursów, aby rozpocząć naukę."
      />
    );
  } else if (loadError) {
    return <FlashcardsPlaceholderCard title={loadError} />;
  } else if (!customCards.length) {
    return (
      <FlashcardsPlaceholderCard
        title={t("screens.flashcards.flashcards.flashcards.title.brakFiszekWKursie")}
        description="Dodaj fiszki do tego kursu, aby móc z nich korzystać."
      />
    );
  } else if (isCourseFinishedVisible) {
    return (
      <CourseFinishedPanel
        courseName={customCourse?.name?.trim() || "Kurs"}
        courseFlagSource={courseFinishedFlagSource}
        customCourseFlagSource={courseFinishedFlagSource}
        courseIconProps={courseFinishedIconProps}
        cardsCountLabel={String(customCards.length)}
        accuracyLabel={courseFinishedAccuracyLabel}
        learningTimeLabel={courseFinishedTimeLabel}
        onBackToCourses={onBackToCourses}
      />
    );
  } else {
    return (
      <View pointerEvents={isHeld ? "none" : "auto"}>
        <Card
          {...cardProps}
          isContentHeld={isHeld}
          isFocused={isCardFocusEnabled && !shouldDisableTutorialCardAutofocus}
          disableLayoutAnimation={isHeld || shouldKeepLoadingOverlayVisible || showLoadingOverlay}
          // Keep the mounted input and keyboard, but reject stale input events.
          {...(isHeld ? {
            setAnswer: ignoreHeldCardAction,
            setResult: ignoreHeldCardAction,
            confirm: ignoreHeldCardAction,
            wrongInputChange: ignoreHeldCardAction,
            setCorrectionRewers: ignoreHeldCardAction,
            onHintUpdate: cardProps.onHintUpdate ? ignoreHeldCardAction : undefined,
            onEdit: cardProps.onEdit ? ignoreHeldCardAction : undefined,
            shouldStartHintEditing: () => false,
            autoSubmitCorrectAnswer: false,
            inlineAction: cardProps.inlineAction ? {
              ...cardProps.inlineAction,
              disabled: true,
              onCorrectionConfirm: ignoreHeldCardAction,
            } : undefined,
          } : {})}
        />
      </View>
    );
  }
}
