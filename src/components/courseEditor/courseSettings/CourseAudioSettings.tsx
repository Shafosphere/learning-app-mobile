import { CourseAudioDownloadPanels } from "@/Audio/runtime/LanguageAudioDownloadPanel";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { CourseSettingsSectionProps } from "./types";
import {
  SettingsToggleRow,
  SettingsChoiceBlock,
  type SharedStyles,
} from "./SettingsControls";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  AUDIO_LANGUAGES,
  normalizeFlashcardAutoplayMode,
} from "@/src/contexts/settings/courseAudioSettings";
import { AudioAutoplaySettingsSection } from "../AudioAutoplaySettingsSection";

type Props = Pick<
  CourseSettingsSectionProps,
  | "audioCourseSlug"
  | "styles"
  | "audioSettings"
  | "onChangeAudioSettings"
  | "audioSettingsDisabled"
  | "showAudioLanguages"
>;

export function CourseAudioSettings({
  audioCourseSlug,
  styles,
  audioSettings,
  onChangeAudioSettings,
  audioSettingsDisabled = false,
  showAudioLanguages = false,
}: Props) {
  const { t } = useTranslation();
  const sharedStyles = styles as SharedStyles;
  const { nativeLanguage } = useSettings();
  if (!audioSettings || !onChangeAudioSettings) return null;
  return (
    <View testID="course-audio-settings">
      <CourseAudioDownloadPanels slug={audioCourseSlug} />
      <View style={sharedStyles.settingsGroupCard}>
        <SettingsToggleRow
          styles={sharedStyles}
          title={t("courseAudio.title")}
          description={t("courseAudio.description")}
          value={audioSettings.enabled}
          onPress={() =>
            onChangeAudioSettings({
              ...audioSettings,
              enabled: !audioSettings.enabled,
            })
          }
          accessibilityLabel={t("courseAudio.toggleLabel")}
          disabled={audioSettingsDisabled}
        />
      </View>
      <AudioAutoplaySettingsSection
        nativeLanguage={nativeLanguage}
        value={normalizeFlashcardAutoplayMode(audioSettings.autoplayMode)}
        onSelect={(autoplayMode) =>
          onChangeAudioSettings({
            ...audioSettings,
            autoplayMode,
          })
        }
        disabled={audioSettingsDisabled}
      />
      {showAudioLanguages ? (
        <>
          <Text style={sharedStyles.settingsRowDescription}>
            {t("courseAudio.chooseLanguages")}
          </Text>
          {(["frontLanguage", "backLanguage"] as const).map((side) => (
            <SettingsChoiceBlock
              key={side}
              styles={sharedStyles}
              title={t(`courseAudio.${side}`)}
              accessibilityLabelPrefix={t(`courseAudio.${side}`)}
              description=""
              options={AUDIO_LANGUAGES.map((key) => ({
                key,
                title: t(`courseAudio.languages.${key}`),
                subtitle: "",
              }))}
              value={audioSettings[side] ?? ""}
              onSelect={(language) =>
                onChangeAudioSettings({
                  ...audioSettings,
                  [side]: language,
                })
              }
              disabled={audioSettingsDisabled}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}
