import {
  SettingsChoiceGrid,
  SettingsChoiceHeader,
  useSettingsChoiceLayout,
} from "./SettingsChoiceLayout";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import type { CourseFrontImageRole } from "@/src/contexts/settings/types";
import { SettingsChoiceCard } from "./SettingsChoiceCard";
import { useStyles } from "./SettingsChoiceCard-styles";

type Props = {
  value: CourseFrontImageRole;
  onSelect: (value: CourseFrontImageRole) => void;
  disabled: boolean;
};

const COPY = "courseFrontImageRole";

export function ImageDisplaySettingsSection({
  value,
  onSelect,
  disabled,
}: Props) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { stacked, onLayout } = useSettingsChoiceLayout(284);
  const renderOption = (role: CourseFrontImageRole) => (
    <SettingsChoiceCard
      key={role}
      title={t(`${COPY}.${role}.title`)}
      description={t(`${COPY}.${role}.description`)}
      accessibilityLabel={`${t(`${COPY}.title`)}: ${t(`${COPY}.${role}.title`)}`}
      accessibilityHint={t(`${COPY}.${role}.description`)}
      icon="image"
      accent="teal"
      selected={value === role}
      onPress={() => onSelect(role)}
      disabled={disabled}
      emphasizeSelectedBorder
    />
  );
  return (
    <View
      style={styles.section}
      onLayout={onLayout}
      testID="course-image-display-settings"
    >
      <SettingsChoiceHeader
        title={t(`${COPY}.title`)}
        description={t(`${COPY}.description`)}
        icon="image-outline"
      />
      <SettingsChoiceGrid
        options={["standard", "replace_front", "replace_back"] as const}
        stacked={stacked}
        renderOption={renderOption}
        firstRowTestID="course-image-display-first-row"
      />
    </View>
  );
}
