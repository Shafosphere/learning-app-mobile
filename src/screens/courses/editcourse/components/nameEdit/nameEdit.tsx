import { Text, TextInput } from "react-native";

import { useStyles } from "./nameEdit-styles";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  editable?: boolean;
  disabled?: boolean;
};

export function CourseNameField({
  value,
  onChange,
  placeholder = "np. Fiszki podróżnicze",
  editable = true,
  disabled = false,
}: Props) {
  const styles = useStyles();

  return (
    <>
      <Text style={styles.label}>nazwa</Text>
      <TextInput
        style={styles.nameInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={styles.nameInput.color}
        accessibilityLabel="Nazwa kursu"
        editable={editable && !disabled}
      />
    </>
  );
}

export default CourseNameField;

