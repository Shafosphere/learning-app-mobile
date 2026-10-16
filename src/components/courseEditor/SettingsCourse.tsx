import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { CourseLearningSettings } from "./courseSettings/CourseLearningSettings";
import { CourseAnswerSettings } from "./courseSettings/CourseAnswerSettings";
import { CourseAudioSettings } from "./courseSettings/CourseAudioSettings";
import { CourseAppearanceSettings } from "./courseSettings/CourseAppearanceSettings";
import { SettingsGroup } from "./courseSettings/SettingsGroup";
import type { CourseSettingsSectionProps } from "./courseSettings/types";
import type { CourseSettingsTabKey } from "./courseSettings/useCourseSettingsTabs";
export type { CourseSettingsSectionProps } from "./courseSettings/types";

export function CourseSettingsSection(
  props: CourseSettingsSectionProps & { activeTab?: CourseSettingsTabKey },
) {
  const { t } = useTranslation();
  if (props.activeTab) {
    switch (props.activeTab) {
      case "learning":
        return <CourseLearningSettings {...props} showHeading={false} />;
      case "answers":
        return <CourseAnswerSettings {...props} />;
      case "audio":
        return <CourseAudioSettings {...props} />;
      case "appearance":
        return <CourseAppearanceSettings {...props} />;
      case "progress":
        return null;
    }
  }
  return (
    <View>
      <CourseLearningSettings {...props} />
      <SettingsGroup
        title={t("courseSettingsGroups.answers.title")}
        description={t("courseSettingsGroups.answers.description")}
      >
        <CourseAnswerSettings {...props} />
      </SettingsGroup>
      {props.audioSettings && props.onChangeAudioSettings ? (
        <SettingsGroup
          title={t("courseSettingsGroups.audio.title")}
          description={t("courseSettingsGroups.audio.description")}
        >
          <CourseAudioSettings {...props} />
        </SettingsGroup>
      ) : null}
      <SettingsGroup
        title={t("courseSettingsGroups.appearance.title")}
        description={t("courseSettingsGroups.appearance.description")}
      >
        <CourseAppearanceSettings {...props} />
      </SettingsGroup>
    </View>
  );
}
