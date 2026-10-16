import type { OfficialPackCourseSettings } from "@/src/constants/officialPacks";
import { DEFAULT_COURSE_AUDIO_SETTINGS } from "@/src/contexts/settings/courseAudioSettings";
import type {
  BoxZeroAnswerSide, CourseAudioSettings, CourseFrontImageRole,
  FlashcardsCardSize, FlashcardsImageSize, LetterHintSettings, TrueFalseButtonsVariant,
} from "@/src/contexts/settings/types";
import { DEFAULT_LETTER_HINT_SETTINGS } from "@/src/utils/letterHints";

export type CourseSettingsDefaults = {
  boxZeroEnabled: boolean;
  boxZeroAnswerSide: BoxZeroAnswerSide;
  autoflowEnabled: boolean;
  reviewsEnabled: boolean;
  showExplanationEnabled: boolean;
  explanationOnlyOnWrong: boolean;
  skipCorrectionEnabled: boolean;
  trueFalseButtonsVariant: TrueFalseButtonsVariant;
  cardSize: FlashcardsCardSize;
  imageSize: FlashcardsImageSize;
  imageFrameEnabled: boolean;
  frontImageRole: CourseFrontImageRole;
  letterHintSettings: LetterHintSettings;
  audioSettings: CourseAudioSettings;
};

export function resolveCourseSettingsDefaults(
  pack?: { settings?: OfficialPackCourseSettings; reviewsEnabled?: boolean },
  trueFalseOnly = false,
): CourseSettingsDefaults {
  const settings = pack?.settings;
  return {
    boxZeroEnabled: settings?.boxZeroEnabled ?? settings?.boxZero ?? false,
    boxZeroAnswerSide: settings?.boxZeroAnswerSide ?? "back",
    autoflowEnabled: settings?.autoflowEnabled ?? settings?.autoflow ?? settings?.Autoflow ?? true,
    reviewsEnabled: pack ? pack.reviewsEnabled ?? true : false,
    showExplanationEnabled: true,
    explanationOnlyOnWrong: false,
    skipCorrectionEnabled: trueFalseOnly || (settings?.skipCorrectionEnabled ?? settings?.skipCorrection ?? false),
    trueFalseButtonsVariant: "true_false",
    cardSize: settings?.cardSize ?? "large",
    imageSize: settings?.imageSize ?? "dynamic",
    imageFrameEnabled: settings?.imageFrameEnabled ?? true,
    frontImageRole: settings?.frontImageRole ?? "standard",
    letterHintSettings: { ...(settings?.letterHintSettings ?? DEFAULT_LETTER_HINT_SETTINGS) },
    audioSettings: {
      ...DEFAULT_COURSE_AUDIO_SETTINGS,
      enabled: settings?.audioEnabled ?? false,
      autoplayMode: "non_native",
    },
  };
}
