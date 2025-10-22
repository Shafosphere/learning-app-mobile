import { ReactNode } from "react";
import {
  Pressable,
  Text,
  TextInput,
  TextStyle,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { CourseIconColorSelector } from "@/src/components/customCourse/CourseIconColorSelector";
import { CourseColorOption } from "@/src/constants/customCourse";
import { useCustomCourseFormStyles } from "./CustomCourseForm-styles";

export interface CustomCourseFormProps {
  title: string;
  courseName: string;
  onCourseNameChange: (value: string) => void;
  reviewsEnabled: boolean;
  onToggleReviews: () => void;
  iconId: string | null;
  iconColor: string;
  colorId: string | null;
  onIconChange: (iconId: string) => void;
  onColorChange: (color: CourseColorOption) => void;
  namePlaceholder?: string;
  disabled?: boolean;
  nameEditable?: boolean;
  hideIconSection?: boolean;
  hideReviewsToggle?: boolean;
  children?: ReactNode;
}

export function CustomCourseForm({
  title,
  courseName,
  onCourseNameChange,
  reviewsEnabled,
  onToggleReviews,
  iconId,
  iconColor,
  colorId,
  onIconChange,
  onColorChange,
  namePlaceholder = "np. Fiszki podróżnicze",
  disabled = false,
  nameEditable = true,
  hideIconSection = false,
  hideReviewsToggle = false,
  children,
}: CustomCourseFormProps) {
  const styles = useCustomCourseFormStyles();
  const checkboxIconColor =
    (styles.checkboxIcon as TextStyle)?.color ?? "#ffffff";

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{title}</Text>
      <View style={styles.content}>
        <View>
          <Text style={styles.label}>nazwa</Text>
          <TextInput
            style={styles.nameInput}
            value={courseName}
            onChangeText={onCourseNameChange}
            placeholder={namePlaceholder}
            accessibilityLabel="Nazwa kursu"
            editable={nameEditable && !disabled}
          />
        </View>

        {hideReviewsToggle ? null : (
          <View style={styles.checkboxRow}>
            <Pressable
              style={({ pressed }) => [
                styles.checkboxPressable,
                pressed && styles.checkboxPressablePressed,
              ]}
              onPress={onToggleReviews}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: reviewsEnabled }}
              accessibilityLabel="Włącz udział kursu w powtórkach"
              disabled={disabled}
            >
              <View
                style={[
                  styles.checkboxBase,
                  reviewsEnabled && styles.checkboxBaseChecked,
                ]}
              >
                {reviewsEnabled ? (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={checkboxIconColor}
                  />
                ) : null}
              </View>
              <Text style={styles.checkboxLabel}>włącz powtórki</Text>
            </Pressable>
          </View>
        )}

        {hideIconSection ? null : (
          <View style={styles.iconSection}>
            <Text style={styles.label}>ikona</Text>
            <CourseIconColorSelector
              selectedIcon={iconId}
              selectedColor={iconColor}
              selectedColorId={colorId ?? undefined}
              onIconChange={onIconChange}
              onColorChange={onColorChange}
              disabled={disabled}
              styles={{
                iconsContainer: styles.iconsContainer,
                iconWrapper: styles.iconWrapper,
                iconWrapperSelected: styles.iconWrapperSelected,
                colorsContainer: styles.colorsContainer,
                colorSwatch: styles.courseColor,
                colorSwatchSelected: styles.courseColorSelected,
              }}
            />
          </View>
        )}

        {children ? (
          <View style={styles.childrenContainer}>{children}</View>
        ) : null}
      </View>
    </View>
  );
}

export default CustomCourseForm;
