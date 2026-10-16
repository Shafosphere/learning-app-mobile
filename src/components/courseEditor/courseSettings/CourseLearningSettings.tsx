import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { CourseSettingsSectionProps } from "./types";
import { SettingsToggleRow, type SharedStyles } from "./SettingsControls";
import { BoxZeroSettingsSection } from "../BoxZeroSettingsSection";

type Props = Pick<
  CourseSettingsSectionProps,
  | "styles"
  | "autoflowEnabled"
  | "onToggleAutoflow"
  | "reviewsEnabled"
  | "onToggleReviews"
  | "boxZeroEnabled"
  | "onToggleBoxZero"
  | "boxZeroAnswerSide"
  | "onSelectBoxZeroAnswerSide"
> & { showHeading?: boolean };

export function CourseLearningSettings({
  styles,
  autoflowEnabled,
  onToggleAutoflow,
  reviewsEnabled,
  onToggleReviews,
  boxZeroEnabled,
  onToggleBoxZero,
  boxZeroAnswerSide = "back",
  onSelectBoxZeroAnswerSide,
  showHeading = true,
}: Props) {
  const { t } = useTranslation();
  const sharedStyles = styles as SharedStyles;
  return (
    <View testID="course-learning-settings">
      {showHeading ? (
        <Text
          accessibilityRole="header"
          style={sharedStyles.settingsGroupLabel}
        >
          {t("courseSettingsGroups.learning.title")}
        </Text>
      ) : null}
      <View style={sharedStyles.settingsGroupCard}>
        <SettingsToggleRow
          styles={sharedStyles}
          title={t(
            "components.courseEditor.settingsCourse.title.automatFiszek",
          )}
          description={t(
            "components.courseEditor.settingsCourse.description.automatyczniePrzelaczaj",
          )}
          value={autoflowEnabled}
          onPress={() => onToggleAutoflow(!autoflowEnabled)}
          accessibilityLabel={t(
            "components.courseEditor.settingsCourse.accessibilityLabel.przelaczAutomatFiszek",
          )}
        />
        <View style={sharedStyles.settingsGroupDivider} />
        <SettingsToggleRow
          styles={sharedStyles}
          title={t(
            "components.courseEditor.settingsCourse.title.wlaczPowtorki",
          )}
          description={t(
            "components.courseEditor.settingsCourse.description.dodajFiszkiDoPowtorek",
          )}
          value={reviewsEnabled}
          onPress={() => onToggleReviews(!reviewsEnabled)}
          accessibilityLabel={t(
            "components.courseEditor.settingsCourse.accessibilityLabel.przelaczPowtorki",
          )}
        />
        <View style={sharedStyles.settingsGroupDivider} />
        <SettingsToggleRow
          styles={sharedStyles}
          title={t(
            "components.courseEditor.settingsCourse.title.fazaZapoznaniaPudelko0",
          )}
          description={t(
            "components.courseEditor.settingsCourse.description.dodatkowePudelko",
          )}
          value={boxZeroEnabled}
          onPress={() => onToggleBoxZero(!boxZeroEnabled)}
          accessibilityLabel={t(
            "components.courseEditor.settingsCourse.accessibilityLabel.przelaczFazeZapoznania",
          )}
        />
      </View>
      <BoxZeroSettingsSection
        boxZeroEnabled={boxZeroEnabled}
        boxZeroAnswerSide={boxZeroAnswerSide}
        onSelectBoxZeroAnswerSide={onSelectBoxZeroAnswerSide}
      />
    </View>
  );
}
