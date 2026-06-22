import { useCallback, useMemo } from "react";

import { usePersistedState } from "@/src/hooks/usePersistedState";
import type { LanguageCourse } from "@/src/types/course";

import {
  DEFAULT_COURSE_AUTOFLOW_OVERRIDES,
  DEFAULT_COURSE_BOX_ZERO_OVERRIDES,
  DEFAULT_COURSE_CARD_SIZE_OVERRIDES,
  DEFAULT_COURSE_EXPLANATION_ONLY_ON_WRONG_OVERRIDES,
  DEFAULT_COURSE_IMAGE_FRAME_OVERRIDES,
  DEFAULT_COURSE_IMAGE_SIZE_OVERRIDES,
  DEFAULT_COURSE_SHOW_EXPLANATION_OVERRIDES,
  DEFAULT_COURSE_SKIP_CORRECTION_OVERRIDES,
  DEFAULT_COURSE_TRUE_FALSE_BUTTONS_OVERRIDES,
} from "./defaults";
import {
  resolveActiveCourseOverride,
  resolveBuiltinOverride,
  resolveCustomOverride,
  setBuiltinOverride,
  setCustomOverride,
} from "./courseOverrideHelpers";
import type {
  CourseAutoflowOverrides,
  CourseBoxZeroKeyParams,
  CourseBoxZeroOverrides,
  CourseCardSizeOverrides,
  CourseExplanationOnlyOnWrongOverrides,
  CourseImageFrameOverrides,
  CourseImageSizeOverrides,
  CourseOverrideState,
  CourseShowExplanationOverrides,
  CourseSkipCorrectionOverrides,
  CourseTrueFalseButtonsOverrides,
  FlashcardsCardSize,
  FlashcardsImageSize,
  TrueFalseButtonsVariant,
} from "./types";

type UseCourseOverrideAccessorsParams<T> = {
  courses: LanguageCourse[];
  activeCourseIdx: number | null;
  activeCustomCourseId: number | null;
  defaultValue: T;
  overrides: CourseOverrideState<T>;
  setOverrides: (value: CourseOverrideState<T>) => Promise<void>;
};

function useCourseOverrideAccessors<T>({
  courses,
  activeCourseIdx,
  activeCustomCourseId,
  defaultValue,
  overrides,
  setOverrides,
}: UseCourseOverrideAccessorsParams<T>) {
  const getBuiltin = useCallback(
    (params: CourseBoxZeroKeyParams) =>
      resolveBuiltinOverride(params, overrides, defaultValue),
    [defaultValue, overrides]
  );

  const setBuiltin = useCallback(
    async (params: CourseBoxZeroKeyParams, value: T) => {
      await setBuiltinOverride({
        params,
        value,
        defaultValue,
        overrides,
        setOverrides,
      });
    },
    [defaultValue, overrides, setOverrides]
  );

  const getCustom = useCallback(
    (courseId: number) =>
      resolveCustomOverride(courseId, overrides, defaultValue),
    [defaultValue, overrides]
  );

  const setCustom = useCallback(
    async (courseId: number, value: T) => {
      await setCustomOverride({
        courseId,
        value,
        defaultValue,
        overrides,
        setOverrides,
      });
    },
    [defaultValue, overrides, setOverrides]
  );

  const activeValue = useMemo(
    () =>
      resolveActiveCourseOverride({
        courses,
        activeCourseIdx,
        activeCustomCourseId,
        defaultValue,
        getBuiltin,
        getCustom,
      }),
    [
      activeCourseIdx,
      activeCustomCourseId,
      courses,
      defaultValue,
      getBuiltin,
      getCustom,
    ]
  );

  return {
    activeValue,
    getBuiltin,
    setBuiltin,
    getCustom,
    setCustom,
  };
}

export function useCourseOverrideSettings({
  courses,
  activeCourseIdx,
  activeCustomCourseId,
}: {
  courses: LanguageCourse[];
  activeCourseIdx: number | null;
  activeCustomCourseId: number | null;
}) {
  const [boxZeroDefaultEnabled] = usePersistedState<boolean>(
    "flashcards.boxZeroEnabled",
    false
  );
  const [boxZeroOverrides, setBoxZeroOverrides] =
    usePersistedState<CourseBoxZeroOverrides>(
      "flashcards.courseBoxZeroOverrides",
      DEFAULT_COURSE_BOX_ZERO_OVERRIDES
    );
  const boxZero = useCourseOverrideAccessors({
    courses,
    activeCourseIdx,
    activeCustomCourseId,
    defaultValue: boxZeroDefaultEnabled,
    overrides: boxZeroOverrides,
    setOverrides: setBoxZeroOverrides,
  });

  const [autoflowDefaultEnabled] = usePersistedState<boolean>(
    "flashcards.autoflowEnabled",
    true
  );
  const [autoflowOverrides, setAutoflowOverrides] =
    usePersistedState<CourseAutoflowOverrides>(
      "flashcards.courseAutoflowOverrides",
      DEFAULT_COURSE_AUTOFLOW_OVERRIDES
    );
  const autoflow = useCourseOverrideAccessors({
    courses,
    activeCourseIdx,
    activeCustomCourseId,
    defaultValue: autoflowDefaultEnabled,
    overrides: autoflowOverrides,
    setOverrides: setAutoflowOverrides,
  });

  const [showExplanationDefaultEnabled] = usePersistedState<boolean>(
    "flashcards.showExplanationEnabled",
    true
  );
  const [showExplanationOverrides, setShowExplanationOverrides] =
    usePersistedState<CourseShowExplanationOverrides>(
      "flashcards.courseShowExplanationOverrides",
      DEFAULT_COURSE_SHOW_EXPLANATION_OVERRIDES
    );
  const showExplanation = useCourseOverrideAccessors({
    courses,
    activeCourseIdx,
    activeCustomCourseId,
    defaultValue: showExplanationDefaultEnabled,
    overrides: showExplanationOverrides,
    setOverrides: setShowExplanationOverrides,
  });

  const [explanationOnlyOnWrongDefaultEnabled] = usePersistedState<boolean>(
    "flashcards.explanationOnlyOnWrong",
    false
  );
  const [
    explanationOnlyOnWrongOverrides,
    setExplanationOnlyOnWrongOverrides,
  ] = usePersistedState<CourseExplanationOnlyOnWrongOverrides>(
    "flashcards.courseExplanationOnlyOnWrongOverrides",
    DEFAULT_COURSE_EXPLANATION_ONLY_ON_WRONG_OVERRIDES
  );
  const explanationOnlyOnWrong = useCourseOverrideAccessors({
    courses,
    activeCourseIdx,
    activeCustomCourseId,
    defaultValue: explanationOnlyOnWrongDefaultEnabled,
    overrides: explanationOnlyOnWrongOverrides,
    setOverrides: setExplanationOnlyOnWrongOverrides,
  });

  const [skipCorrectionDefaultEnabled] = usePersistedState<boolean>(
    "flashcards.skipCorrectionEnabled",
    false
  );
  const [skipCorrectionOverrides, setSkipCorrectionOverrides] =
    usePersistedState<CourseSkipCorrectionOverrides>(
      "flashcards.courseSkipCorrectionOverrides",
      DEFAULT_COURSE_SKIP_CORRECTION_OVERRIDES
    );
  const skipCorrection = useCourseOverrideAccessors({
    courses,
    activeCourseIdx,
    activeCustomCourseId,
    defaultValue: skipCorrectionDefaultEnabled,
    overrides: skipCorrectionOverrides,
    setOverrides: setSkipCorrectionOverrides,
  });

  const [trueFalseButtonsVariantDefault] =
    usePersistedState<TrueFalseButtonsVariant>(
      "flashcards.trueFalseButtonsVariant",
      "true_false"
    );
  const [trueFalseButtonsOverrides, setTrueFalseButtonsOverrides] =
    usePersistedState<CourseTrueFalseButtonsOverrides>(
      "flashcards.courseTrueFalseButtonsOverrides",
      DEFAULT_COURSE_TRUE_FALSE_BUTTONS_OVERRIDES
    );
  const trueFalseButtons = useCourseOverrideAccessors({
    courses,
    activeCourseIdx,
    activeCustomCourseId,
    defaultValue: trueFalseButtonsVariantDefault,
    overrides: trueFalseButtonsOverrides,
    setOverrides: setTrueFalseButtonsOverrides,
  });

  const [flashcardsCardSizeDefault, setFlashcardsCardSizeDefault] =
    usePersistedState<FlashcardsCardSize>("flashcards.cardSize", "large");
  const [cardSizeOverrides, setCardSizeOverrides] =
    usePersistedState<CourseCardSizeOverrides>(
      "flashcards.courseCardSizeOverrides",
      DEFAULT_COURSE_CARD_SIZE_OVERRIDES
    );
  const cardSize = useCourseOverrideAccessors({
    courses,
    activeCourseIdx,
    activeCustomCourseId,
    defaultValue: flashcardsCardSizeDefault,
    overrides: cardSizeOverrides,
    setOverrides: setCardSizeOverrides,
  });

  const [flashcardsImageSizeDefault, setFlashcardsImageSizeDefault] =
    usePersistedState<FlashcardsImageSize>("flashcards.imageSize", "dynamic");
  const [imageSizeOverrides, setImageSizeOverrides] =
    usePersistedState<CourseImageSizeOverrides>(
      "flashcards.courseImageSizeOverrides",
      DEFAULT_COURSE_IMAGE_SIZE_OVERRIDES
    );
  const imageSize = useCourseOverrideAccessors({
    courses,
    activeCourseIdx,
    activeCustomCourseId,
    defaultValue: flashcardsImageSizeDefault,
    overrides: imageSizeOverrides,
    setOverrides: setImageSizeOverrides,
  });

  const [
    flashcardsImageFrameDefaultEnabled,
    setFlashcardsImageFrameDefaultEnabled,
  ] = usePersistedState<boolean>("flashcards.imageFrameEnabled", true);
  const [imageFrameOverrides, setImageFrameOverrides] =
    usePersistedState<CourseImageFrameOverrides>(
      "flashcards.courseImageFrameOverrides",
      DEFAULT_COURSE_IMAGE_FRAME_OVERRIDES
    );
  const imageFrame = useCourseOverrideAccessors({
    courses,
    activeCourseIdx,
    activeCustomCourseId,
    defaultValue: flashcardsImageFrameDefaultEnabled,
    overrides: imageFrameOverrides,
    setOverrides: setImageFrameOverrides,
  });

  return {
    boxZeroEnabled: boxZero.activeValue,
    getBuiltinCourseBoxZeroEnabled: boxZero.getBuiltin,
    setBuiltinCourseBoxZeroEnabled: boxZero.setBuiltin,
    getCustomCourseBoxZeroEnabled: boxZero.getCustom,
    setCustomCourseBoxZeroEnabled: boxZero.setCustom,
    autoflowEnabled: autoflow.activeValue,
    getBuiltinCourseAutoflowEnabled: autoflow.getBuiltin,
    setBuiltinCourseAutoflowEnabled: autoflow.setBuiltin,
    getCustomCourseAutoflowEnabled: autoflow.getCustom,
    setCustomCourseAutoflowEnabled: autoflow.setCustom,
    showExplanationEnabled: showExplanation.activeValue,
    getBuiltinCourseShowExplanationEnabled: showExplanation.getBuiltin,
    setBuiltinCourseShowExplanationEnabled: showExplanation.setBuiltin,
    getCustomCourseShowExplanationEnabled: showExplanation.getCustom,
    setCustomCourseShowExplanationEnabled: showExplanation.setCustom,
    explanationOnlyOnWrong: explanationOnlyOnWrong.activeValue,
    getBuiltinCourseExplanationOnlyOnWrong: explanationOnlyOnWrong.getBuiltin,
    setBuiltinCourseExplanationOnlyOnWrong: explanationOnlyOnWrong.setBuiltin,
    getCustomCourseExplanationOnlyOnWrong: explanationOnlyOnWrong.getCustom,
    setCustomCourseExplanationOnlyOnWrong: explanationOnlyOnWrong.setCustom,
    skipCorrectionEnabled: skipCorrection.activeValue,
    getBuiltinCourseSkipCorrectionEnabled: skipCorrection.getBuiltin,
    setBuiltinCourseSkipCorrectionEnabled: skipCorrection.setBuiltin,
    getCustomCourseSkipCorrectionEnabled: skipCorrection.getCustom,
    setCustomCourseSkipCorrectionEnabled: skipCorrection.setCustom,
    trueFalseButtonsVariant: trueFalseButtons.activeValue,
    getBuiltinCourseTrueFalseButtonsVariant: trueFalseButtons.getBuiltin,
    setBuiltinCourseTrueFalseButtonsVariant: trueFalseButtons.setBuiltin,
    getCustomCourseTrueFalseButtonsVariant: trueFalseButtons.getCustom,
    setCustomCourseTrueFalseButtonsVariant: trueFalseButtons.setCustom,
    flashcardsCardSize: cardSize.activeValue,
    flashcardsCardSizeDefault,
    setFlashcardsCardSizeDefault,
    getBuiltinCourseCardSize: cardSize.getBuiltin,
    setBuiltinCourseCardSize: cardSize.setBuiltin,
    getCustomCourseCardSize: cardSize.getCustom,
    setCustomCourseCardSize: cardSize.setCustom,
    flashcardsImageSize: imageSize.activeValue,
    flashcardsImageSizeDefault,
    setFlashcardsImageSizeDefault,
    getBuiltinCourseImageSize: imageSize.getBuiltin,
    setBuiltinCourseImageSize: imageSize.setBuiltin,
    getCustomCourseImageSize: imageSize.getCustom,
    setCustomCourseImageSize: imageSize.setCustom,
    flashcardsImageFrameEnabled: imageFrame.activeValue,
    flashcardsImageFrameDefaultEnabled,
    setFlashcardsImageFrameDefaultEnabled,
    getBuiltinCourseImageFrameEnabled: imageFrame.getBuiltin,
    setBuiltinCourseImageFrameEnabled: imageFrame.setBuiltin,
    getCustomCourseImageFrameEnabled: imageFrame.getCustom,
    setCustomCourseImageFrameEnabled: imageFrame.setCustom,
  };
}
