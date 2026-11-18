import type {
  CourseAudioSettings,
  CourseFrontImageRole,
  BoxZeroAnswerSide,
  LetterHintSettings,
  FlashcardsCardSize,
  FlashcardsImageSize,
  TrueFalseButtonsVariant,
} from "@/src/contexts/SettingsContext";
import type { ThemeColors } from "@/src/theme/theme";
type SwitchColors = {
  thumb: string;
  trackFalse: string;
  trackTrue: string;
};
export type CourseSettingsSectionProps = {
  audioCourseSlug?: string | null;
  frontImageRole?: CourseFrontImageRole;
  onChangeFrontImageRole?: (role: CourseFrontImageRole) => void;
  frontImageRoleDisabled?: boolean;
  audioSettings?: CourseAudioSettings;
  onChangeAudioSettings?: (settings: CourseAudioSettings) => void;
  audioSettingsDisabled?: boolean;
  showAudioLanguages?: boolean;
  styles: Record<string, unknown>;
  switchColors: SwitchColors;
  colors: ThemeColors;
  boxZeroAnswerSide?: BoxZeroAnswerSide;
  onSelectBoxZeroAnswerSide?: (side: BoxZeroAnswerSide) => void;
  letterHintSettings?: LetterHintSettings;
  onChangeLetterHintSettings?: (value: LetterHintSettings) => void;
  letterHintSettingsDisabled?: boolean;
  boxZeroEnabled: boolean;
  onToggleBoxZero: (value: boolean) => void;
  autoflowEnabled: boolean;
  onToggleAutoflow: (value: boolean) => void;
  reviewsEnabled: boolean;
  onToggleReviews: (value: boolean) => void;
  showExplanationEnabled: boolean;
  onToggleShowExplanation: (value: boolean) => void;
  explanationOnlyOnWrong: boolean;
  onToggleExplanationOnlyOnWrong: (value: boolean) => void;
  skipCorrectionEnabled: boolean;
  onToggleSkipCorrection: (value: boolean) => void;
  skipCorrectionLocked?: boolean;
  hideSkipCorrectionOption?: boolean;
  trueFalseButtonsVariant: TrueFalseButtonsVariant;
  onSelectTrueFalseButtonsVariant: (value: TrueFalseButtonsVariant) => void;
  showTrueFalseButtonsVariant?: boolean;
  cardSize: FlashcardsCardSize;
  onSelectCardSize: (value: FlashcardsCardSize) => void;
  showImageSizeOptions?: boolean;
  imageSize?: FlashcardsImageSize;
  imageSizeOptions?: FlashcardsImageSize[];
  onSelectImageSize?: (value: FlashcardsImageSize) => void;
  imageSizeEnabled?: boolean;
  showImageFrameOption?: boolean;
  imageFrameEnabled?: boolean;
  onToggleImageFrame?: (value: boolean) => void;
};
