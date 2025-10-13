import { ReactNode } from "react";
import {
  Pressable,
  Text,
  TextInput,
  TextStyle,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ProfileIconColorSelector } from "@/src/components/customProfile/ProfileIconColorSelector";
import { ProfileColorOption } from "@/src/hooks/useCustomProfileDraft";
import { useCustomProfileFormStyles } from "./CustomProfileForm-styles";

export interface CustomProfileFormProps {
  title: string;
  profileName: string;
  onProfileNameChange: (value: string) => void;
  reviewsEnabled: boolean;
  onToggleReviews: () => void;
  iconId: string | null;
  iconColor: string;
  colorId: string | null;
  onIconChange: (iconId: string) => void;
  onColorChange: (color: ProfileColorOption) => void;
  namePlaceholder?: string;
  disabled?: boolean;
  children?: ReactNode;
}

export function CustomProfileForm({
  title,
  profileName,
  onProfileNameChange,
  reviewsEnabled,
  onToggleReviews,
  iconId,
  iconColor,
  colorId,
  onIconChange,
  onColorChange,
  namePlaceholder = "np. Fiszki podróżnicze",
  disabled = false,
  children,
}: CustomProfileFormProps) {
  const styles = useCustomProfileFormStyles();
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
            value={profileName}
            onChangeText={onProfileNameChange}
            placeholder={namePlaceholder}
            accessibilityLabel="Nazwa profilu"
            editable={!disabled}
          />
        </View>

        <View style={styles.checkboxRow}>
          <Pressable
            style={({ pressed }) => [
              styles.checkboxPressable,
              pressed && styles.checkboxPressablePressed,
            ]}
            onPress={onToggleReviews}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: reviewsEnabled }}
            accessibilityLabel="Włącz udział profilu w powtórkach"
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

        <View style={styles.iconSection}>
          <Text style={styles.label}>ikona</Text>
          <ProfileIconColorSelector
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
              colorSwatch: styles.profileColor,
              colorSwatchSelected: styles.profileColorSelected,
            }}
          />
        </View>

        {children ? (
          <View style={styles.childrenContainer}>{children}</View>
        ) : null}
      </View>
    </View>
  );
}

export default CustomProfileForm;
