import { Text, TextInput } from "react-native";

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
  placeholder = "np. Fiszki podróżnicze",
  editable = true,
  disabled = false,
  variant = "accent",
}: Props) {
  const styles = useStyles();
  const isPanelVariant = variant === "panel";

  return (
    <>
      <Text style={isPanelVariant ? styles.panelLabel : styles.label}>nazwa</Text>
      <TextInput
        style={isPanelVariant ? styles.panelNameInput : styles.nameInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={
          isPanelVariant ? styles.panelNameInput.color : styles.nameInput.color
        }
        accessibilityLabel="Nazwa kursu"
        editable={editable && !disabled}
      />
    </>
  );
}
