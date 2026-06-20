import Card from "@/src/components/card/card";
import type { CardProps } from "@/src/components/card/card-types";
import { CourseFinishedPanel } from "@/src/components/flashcards/CourseFinishedPanel/CourseFinishedPanel";
import { FlashcardsPlaceholderCard } from "@/src/components/flashcards/FlashcardsPlaceholderCard";
import type { WordWithTranslations } from "@/src/types/boxes";
import type { TFunction } from "i18next";
import type { ComponentProps } from "react";

type CourseFinishedPanelProps = ComponentProps<typeof CourseFinishedPanel>;

type FlashcardsCardSectionProps = {
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
  t: TFunction;
} & Pick<
  CardProps,
  | "selectedItem"
  | "setAnswer"
  | "answer"
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
  | "hideHints"
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
  t,
  selectedItem,
  setAnswer,
  answer,
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
  hideHints,
  showExplanationEnabled,
  explanationOnlyOnWrong,
}: FlashcardsCardSectionProps) {
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
      <Card
        coachmarkId="flashcards-card-section"
        selectedItem={selectedItem}
        setAnswer={setAnswer}
        answer={answer}
        result={displayResult}
        confirm={confirm}
        reversed={reversed}
        setResult={setResult}
        correction={correction}
        wrongInputChange={wrongInputChange}
        setCorrectionRewers={setCorrectionRewers}
        introMode={introModeActive}
        onHintUpdate={onHintUpdate}
        hintCoachmarkId="flashcards-hint-section"
        shouldStartHintEditing={shouldStartHintEditing}
        hintEditRequestToken={hintEditRequestToken}
        isFocused={isCardFocusEnabled && !shouldDisableTutorialCardAutofocus}
        focusRequestToken={focusRequestToken}
        isBetweenCards={isBetweenCards}
        disableLayoutAnimation={
          shouldKeepLoadingOverlayVisible || showLoadingOverlay
        }
        skipCorrectionEnabled={skipCorrectionEnabled}
        hideHints={hideHints}
        showExplanationEnabled={showExplanationEnabled}
        explanationOnlyOnWrong={explanationOnlyOnWrong}
      />
    );
  }
}
