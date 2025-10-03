import { memo } from "react";
import {
  Pressable,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import {
  PROFILE_COLORS,
  PROFILE_ICONS,
} from "@/src/constants/customProfile";

export interface ProfileIconColorSelectorStyles {
  container?: StyleProp<ViewStyle>;
  iconsContainer?: StyleProp<ViewStyle>;
  iconWrapper?: StyleProp<ViewStyle>;
  iconWrapperSelected?: StyleProp<ViewStyle>;
  colorsContainer?: StyleProp<ViewStyle>;
  colorSwatch?: StyleProp<ViewStyle>;
  colorSwatchSelected?: StyleProp<ViewStyle>;
}

export interface ProfileIconColorSelectorProps {
  selectedIcon: string | null;
  selectedColor: string;
  selectedColorId?: string | null;
  onIconChange: (iconId: string) => void;
  onColorChange: (color: (typeof PROFILE_COLORS)[number]) => void;
  disabled?: boolean;
  styles?: ProfileIconColorSelectorStyles;
  iconSize?: number;
}

function ProfileIconColorSelectorComponent({
  selectedIcon,
  selectedColor,
  selectedColorId,
  onIconChange,
  onColorChange,
  disabled = false,
  styles,
  iconSize = 40,
}: ProfileIconColorSelectorProps) {
  const isColorSelected = (hex: string, id: string) => {
    if (selectedColorId) {
      return selectedColorId === id;
    }
    return selectedColor?.toLowerCase() === hex.toLowerCase();
  };

  return (
    <View style={styles?.container}>
      <View style={styles?.iconsContainer}>
        {PROFILE_ICONS.map(({ id, Component, name }) => {
          const isSelected = selectedIcon === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={`Ikona ${name}`}
              onPress={() => onIconChange(id)}
              disabled={disabled}
              style={[
                styles?.iconWrapper,
                isSelected && styles?.iconWrapperSelected,
              ]}
            >
              <Component
                name={name as never}
                size={iconSize}
                color={selectedColor}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles?.colorsContainer}>
        {PROFILE_COLORS.map((color) => {
          const selected = isColorSelected(color.hex, color.id);
          return (
            <Pressable
              key={color.id}
              accessibilityRole="button"
              accessibilityLabel={`Kolor ${color.label}`}
              onPress={() => onColorChange(color)}
              disabled={disabled}
              style={[
                styles?.colorSwatch,
                { backgroundColor: color.hex },
                selected && styles?.colorSwatchSelected,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

export const ProfileIconColorSelector = memo(ProfileIconColorSelectorComponent);

export default ProfileIconColorSelector;
