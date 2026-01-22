import {
  COURSE_ICONS,
  CourseColorOption,
  getCourseColorsForTheme,
} from "@/src/constants/customCourse";
import { useSettings } from "@/src/contexts/SettingsContext";
import { memo, useMemo } from "react";
import {
  Pressable,
  StyleProp,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import { useStyles } from "./iconEdit-styles";

export interface CourseIconColorSelectorStyles {
  container?: StyleProp<ViewStyle>;
  iconsContainer?: StyleProp<ViewStyle>;
  iconWrapper?: StyleProp<ViewStyle>;
  iconWrapperSelected?: StyleProp<ViewStyle>;
  colorsContainer?: StyleProp<ViewStyle>;
  colorSwatch?: StyleProp<ViewStyle>;
  colorSwatchSelected?: StyleProp<ViewStyle>;
  selectionOverlay?: StyleProp<ViewStyle>;
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
  // styles,
  iconSize = 40,
}: CourseIconColorSelectorProps) {
  const { width } = useWindowDimensions();
  const { colors } = useSettings();
  const styles = useStyles();
  const colorOptions = useMemo(
    () => getCourseColorsForTheme(colors),
    [colors]
  );

  const colorRows = useMemo(() => {
    const rows: CourseColorOption[][] = [];
    for (let i = 0; i < colorOptions.length; i += 4) {
      rows.push(colorOptions.slice(i, i + 4));
    }
    return rows;
  }, [colorOptions]);

  const layout = useMemo(() => {
    const baseSize = iconSize ?? 40;
    const baseSpacing = !Number.isFinite(width) || width <= 0 ? 8 : 10;
    const spacing =
      width >= 1200
        ? 14
        : width >= 900
          ? 12
          : width >= 600
            ? 10
            : baseSpacing;
    const scale =
      width >= 1200
        ? 1.35
        : width >= 900
          ? 1.25
          : width >= 600
            ? 1.1
            : width >= 400
              ? 1
              : 0.9;

    return {
      columns: 4, // 4 columns -> 4 rows for 15 icons
      spacing,
      size: Math.min(Math.max(baseSize * scale, 28), 72),
    };
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
        {colorRows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles?.colorsRow}>
            {row.map((color) => {
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
                  ]}
                >
                  {selected && <View style={styles?.selectionOverlay} />}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

export const CourseIconColorSelector = memo(CourseIconColorSelectorComponent);

export default CourseIconColorSelector;
