import { Text, TextInput } from "react-native";
import { useTranslation } from "react-i18next";

import { useStyles } from "./nameEdit-styles";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  editable?: boolean;
  disabled?: boolean;
  variant?: "accent" | "panel";
};

export function CourseNameField({
  value,
  onChange,
  placeholder,
  editable = true,
  disabled = false,
  variant = "accent",
}: Props) {
  const { t } = useTranslation();
  const styles = useStyles();
  const isPanelVariant = variant === "panel";
  const resolvedPlaceholder =
    placeholder ??
    t(
      "components.courseEditor.nameEdit.nameEdit.placeholder.npFiszkiPodroznicze"
    );

  return (
    <>
      <Text style={isPanelVariant ? styles.panelLabel : styles.label}>
        {t("components.courseEditor.nameEdit.nameEdit.textChild.nazwa")}
      </Text>
      <TextInput
        style={isPanelVariant ? styles.panelNameInput : styles.nameInput}
        value={value}
        onChangeText={onChange}
        placeholder={resolvedPlaceholder}
        placeholderTextColor={
          isPanelVariant ? styles.panelNameInput.color : styles.nameInput.color
        }
        accessibilityLabel={t(
          "components.courseEditor.nameEdit.nameEdit.accessibilityLabel.nazwaKursu"
        )}
        editable={editable && !disabled}
      />
    </>
  );
}
