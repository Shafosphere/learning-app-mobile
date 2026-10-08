import { useMemo } from "react";
import type {
  CourseCompletionSummary,
  CustomCourseMasteryProgress,
  CustomCourseRecord,
} from "@/src/db/sqlite/db";
import type { WordWithTranslations } from "@/src/types/boxes";
import { resolveCourseIconProps } from "@/src/constants/customCourse";
import { getFlagSource } from "@/src/constants/languageFlags";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { formatLearningTime } from "../utils/FlashcardsScreen.utils";

type Params = {
  isCourseDisplayReady: boolean;
  remainingNewFlashcardsCount: number;
  totalCardsInBoxes: number;
  selectedItem: WordWithTranslations | null;
  hasCardsReturnedToUnknown: boolean;
  courseMasteryProgress: CustomCourseMasteryProgress;
  isCourseFinishedPreviewVisible: boolean;
  isCourseFinishedPreviewEligible: boolean;
  courseCompletionSummary: CourseCompletionSummary;
  customCourse: CustomCourseRecord | null;
  headlineColor: string;
};

export function useFlashcardsCompletionPanel({
  isCourseDisplayReady,
  remainingNewFlashcardsCount,
  totalCardsInBoxes,
  selectedItem,
  hasCardsReturnedToUnknown,
  courseMasteryProgress,
  isCourseFinishedPreviewVisible,
  isCourseFinishedPreviewEligible,
  courseCompletionSummary,
  customCourse,
  headlineColor,
}: Params) {
  const baseShouldShowBoxes = isCourseDisplayReady;
  const isCourseFinishedActuallyVisible =
    baseShouldShowBoxes &&
    ((remainingNewFlashcardsCount === 0 &&
      totalCardsInBoxes === 0 &&
      selectedItem == null) ||
      (!hasCardsReturnedToUnknown &&
        courseMasteryProgress.cardsCount > 0 &&
        courseMasteryProgress.completedCardsCount >=
          courseMasteryProgress.cardsCount));
  const isCourseFinishedVisible =
    isCourseFinishedActuallyVisible ||
    (isCourseFinishedPreviewVisible && isCourseFinishedPreviewEligible);
  const shouldShowBoxes = baseShouldShowBoxes && !isCourseFinishedVisible;

  const courseFinishedAccuracyLabel =
    courseCompletionSummary.totalAnswers > 0
      ? `${Math.round(
          (courseCompletionSummary.correctCount /
            courseCompletionSummary.totalAnswers) *
            100,
        )}%`
      : "0%";
  const courseFinishedTimeLabel = formatLearningTime(
    courseCompletionSummary.timeMs,
  );
  const courseFinishedFlagSource = useMemo(() => {
    if (!customCourse?.slug) {
      return undefined;
    }

    const manifest = OFFICIAL_PACKS.find(
      (pack) => pack.slug === customCourse.slug,
    );
    const flagLang = manifest?.smallFlag ?? manifest?.sourceLang;
    return flagLang ? getFlagSource(flagLang) : undefined;
  }, [customCourse?.slug]);
  const courseFinishedIconProps = useMemo(() => {
    if (!customCourse) {
      return null;
    }

    return resolveCourseIconProps(
      customCourse.iconId,
      customCourse.iconColor ?? headlineColor,
    );
  }, [customCourse, headlineColor]);
  return {
    isCourseFinishedVisible,
    shouldShowBoxes,
    courseFinishedAccuracyLabel,
    courseFinishedTimeLabel,
    courseFinishedFlagSource,
    courseFinishedIconProps,
  };
}
