import { getCourseImagePacks } from "@/Content/runtime/catalog";
import { usesImagePAD } from "@/Content/runtime/images";
import { CourseImageDownloadRow } from "@/Content/runtime/CourseImageDownloadRow";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import type { CourseSettingsSectionProps } from "./types";
import { SettingsToggleRow, type SharedStyles } from "./SettingsControls";
import { SizeSettingsChoiceBlock } from "../SizeSettingsChoiceBlock";
import { ImageDisplaySettingsSection } from "../ImageDisplaySettingsSection";
import type {
  FlashcardsCardSize,
  FlashcardsImageSize,
} from "@/src/contexts/SettingsContext";
import type { TFunction } from "i18next";

type ChoiceOption<T extends string> = {
  key: T;
  title: string;
  subtitle: string;
};

const buildCardSizeOptions = (
  t: TFunction,
): ChoiceOption<FlashcardsCardSize>[] => [
  {
    key: "large",
    title: t("components.courseEditor.settingsCourse.title.duza"),
    subtitle: t(
      "components.courseEditor.settingsCourse.subtitle.kartaRozszerzaSie",
    ),
  },
  {
    key: "small",
    title: t("components.courseEditor.settingsCourse.title.mala"),
    subtitle: t("components.courseEditor.settingsCourse.subtitle.tekstZostaje"),
  },
];

const buildImageSizeLabels = (
  t: TFunction,
): Record<
  FlashcardsImageSize,
  {
    title: string;
    subtitle: string;
  }
> => ({
  dynamic: {
    title: t("components.courseEditor.settingsCourse.title.dynamiczny"),
    subtitle: t(
      "components.courseEditor.settingsCourse.subtitle.naturalneProporcje",
    ),
  },
  small: {
    title: t("components.courseEditor.settingsCourse.title.maly"),
    subtitle: t(
      "components.courseEditor.settingsCourse.subtitle.czterdziesciProcent",
    ),
  },
  medium: {
    title: t("components.courseEditor.settingsCourse.title.sredni"),
    subtitle: t(
      "components.courseEditor.settingsCourse.subtitle.szescdziesiatProcent",
    ),
  },
  large: {
    title: t("components.courseEditor.settingsCourse.title.duzy"),
    subtitle: t("components.courseEditor.settingsCourse.subtitle.stoProcent"),
  },
  very_large: {
    title: t("components.courseEditor.settingsCourse.title.bardzoDuzy"),
    subtitle: t(
      "components.courseEditor.settingsCourse.subtitle.stoSiedemdziesiatProcent",
    ),
  },
});

type Props = Pick<
  CourseSettingsSectionProps,
  | "audioCourseSlug"
  | "styles"
  | "cardSize"
  | "onSelectCardSize"
  | "frontImageRole"
  | "onChangeFrontImageRole"
  | "frontImageRoleDisabled"
  | "showImageSizeOptions"
  | "imageSize"
  | "imageSizeOptions"
  | "onSelectImageSize"
  | "imageSizeEnabled"
  | "showImageFrameOption"
  | "imageFrameEnabled"
  | "onToggleImageFrame"
>;

export function CourseAppearanceSettings({
  audioCourseSlug,
  styles,
  cardSize,
  onSelectCardSize,
  frontImageRole = "standard",
  onChangeFrontImageRole,
  frontImageRoleDisabled = false,
  showImageSizeOptions = false,
  imageSize,
  imageSizeOptions,
  onSelectImageSize,
  imageSizeEnabled = false,
  showImageFrameOption = false,
  imageFrameEnabled = true,
  onToggleImageFrame,
}: Props) {
  const { t } = useTranslation();
  const sharedStyles = styles as SharedStyles;
  const cardSizeOptions = buildCardSizeOptions(t);
  const imageSizeLabels = buildImageSizeLabels(t);
  const imageOptions = (
    imageSizeOptions ?? ["dynamic", "small", "medium", "large"]
  ).map((key) => ({
    key,
    ...imageSizeLabels[key],
  }));
  return (
    <View testID="course-appearance-settings">
      {(usesImagePAD || __DEV__) && getCourseImagePacks(audioCourseSlug).length > 0 ? <View style={{ marginBottom: 16 }}><CourseImageDownloadRow slug={audioCourseSlug} courseName={t("contentDownload.title")} /></View> : null}
      <SizeSettingsChoiceBlock
        kind="flashcard"
        title={t("components.courseEditor.settingsCourse.title.rozmiarFiszki")}
        description={t(
          "components.courseEditor.settingsCourse.description.zmienWielkoscKarty",
        )}
        options={cardSizeOptions}
        value={cardSize}
        onSelect={onSelectCardSize}
      />

      {onChangeFrontImageRole ? (
        <ImageDisplaySettingsSection
          value={frontImageRole}
          onSelect={onChangeFrontImageRole}
          disabled={frontImageRoleDisabled}
        />
      ) : null}

      {showImageSizeOptions ? (
        <SizeSettingsChoiceBlock
          kind="image"
          fullWidthOption="very_large"
          separated
          title={t(
            "components.courseEditor.settingsCourse.title.rozmiarObrazu",
          )}
          description={t(
            "components.courseEditor.settingsCourse.description.dopasujWysokosc",
          )}
          hint={
            imageSizeEnabled
              ? undefined
              : t(
                  "components.courseEditor.settingsCourse.hint.dostepneTylkoDlaDuzych",
                )
          }
          options={imageOptions}
          value={imageSize ?? "dynamic"}
          onSelect={onSelectImageSize}
          disabled={!imageSizeEnabled || !onSelectImageSize}
        />
      ) : null}

      {showImageFrameOption ? (
        <View style={sharedStyles.settingsGroupCard}>
          <SettingsToggleRow
            styles={sharedStyles}
            title={t(
              "components.courseEditor.settingsCourse.title.ramkaObrazu",
            )}
            description={t(
              "components.courseEditor.settingsCourse.description.pokazujObramowanie",
            )}
            value={imageFrameEnabled}
            onPress={() => onToggleImageFrame?.(!imageFrameEnabled)}
            accessibilityLabel={t(
              "components.courseEditor.settingsCourse.accessibilityLabel.przelaczRamkeObrazu",
            )}
          />
        </View>
      ) : null}
    </View>
  );
}
