import { memo, useMemo } from "react";
import {
  Pressable,
  StyleProp,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import {
  COURSE_ICONS,
  CourseColorOption,
  getCourseColorsForTheme,
} from "@/src/constants/customCourse";
import { useSettings } from "@/src/contexts/SettingsContext";

export interface CourseIconColorSelectorStyles {
  container?: StyleProp<ViewStyle>;
  iconsContainer?: StyleProp<ViewStyle>;
  iconWrapper?: StyleProp<ViewStyle>;
  iconWrapperSelected?: StyleProp<ViewStyle>;
  colorsContainer?: StyleProp<ViewStyle>;
  colorSwatch?: StyleProp<ViewStyle>;
  colorSwatchSelected?: StyleProp<ViewStyle>;
}

export interface CourseIconColorSelectorProps {
  selectedIcon: string | null;
  selectedColor: string;
  selectedColorId?: string | null;
  onIconChange: (iconId: string) => void;
  onColorChange: (color: CourseColorOption) => void;
  disabled?: boolean;
  styles?: CourseIconColorSelectorStyles;
  iconSize?: number;
}

function CourseIconColorSelectorComponent({
  selectedIcon,
  selectedColor,
  selectedColorId,
  onIconChange,
  onColorChange,
  disabled = false,
  styles,
  iconSize = 40,
}: CourseIconColorSelectorProps) {
  const { width } = useWindowDimensions();
  const { colors } = useSettings();

  const colorOptions = useMemo(
    () => getCourseColorsForTheme(colors),
    [colors]
  );

  const layout = useMemo(() => {
    const baseSize = iconSize ?? 40;

    if (!Number.isFinite(width) || width <= 0) {
      return { columns: 3, spacing: 8, size: baseSize };
    }

    if (width >= 1200) {
      return { columns: 6, spacing: 16, size: Math.min(baseSize * 1.5, 72) };
    }

    if (width >= 900) {
      return { columns: 5, spacing: 14, size: Math.min(baseSize * 1.35, 68) };
    }

    if (width >= 600) {
      return { columns: 4, spacing: 12, size: Math.min(baseSize * 1.2, 64) };
    }

    if (width >= 400) {
      return { columns: 4, spacing: 10, size: Math.max(baseSize * 0.95, 32) };
    }

    return { columns: 3, spacing: 8, size: Math.max(baseSize * 0.9, 28) };
  }, [iconSize, width]);

  const baseIconsContainerStyle = useMemo<ViewStyle>(
    () => ({
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-start",
    }),
    []
  );

  const iconWrapperStyle = useMemo<ViewStyle>(() => {
    const percentage = 100 / layout.columns;
    const horizontalPadding = Math.round(layout.spacing / 2);

    return {
      flexBasis: `${percentage}%`,
      maxWidth: `${percentage}%`,
      paddingHorizontal: horizontalPadding,
      paddingVertical: layout.spacing,
      alignItems: "center",
      justifyContent: "center",
    };
  }, [layout.columns, layout.spacing]);

  const computedIconSize = Math.round(layout.size);

  const isColorSelected = (hex: string, id: string) => {
    if (selectedColorId) {
      return selectedColorId === id;
    }
    return selectedColor?.toLowerCase() === hex.toLowerCase();
  };

  return (
    <View style={styles?.container}>
      <View style={[baseIconsContainerStyle, styles?.iconsContainer]}>
        {COURSE_ICONS.map(({ id, Component, name }) => {
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
                iconWrapperStyle,
                isSelected && styles?.iconWrapperSelected,
              ]}
            >
              <Component
                name={name as never}
                size={computedIconSize}
                color={selectedColor}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles?.colorsContainer}>
        {colorOptions.map((color) => {
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

export const CourseIconColorSelector = memo(CourseIconColorSelectorComponent);

export default CourseIconColorSelector;
