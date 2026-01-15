import {
  Theme,
  ThemeColors,
  ThemePalette,
  themeMap,
} from "@/src/theme/theme";
import AntDesign from "@expo/vector-icons/AntDesign";
import Entypo from "@expo/vector-icons/Entypo";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { type ComponentType } from "react";
import { getFlagSource } from "./languageFlags";

export interface CourseColorOption {
  id: string;
  label: string;
  hex: string;
}

type CourseColorSource =
  | (CourseColorOption & { paletteKey?: undefined })
  | (Omit<CourseColorOption, "hex"> & { paletteKey: keyof ThemePalette });

const BASE_COURSE_COLORS: CourseColorSource[] = [
  { id: "scarlet", label: "Szkarłatny", hex: "#FF4B5C" },
  { id: "cherry", label: "Wiśniowy", hex: "#C2185B" },
  { id: "coral", label: "Koralowy", hex: "#FF6B6B" },
  { id: "orange", label: "Pomarańczowy", hex: "#FF8C42" },
  { id: "tangerine", label: "Mandarynkowy", hex: "#FF9F1C" },
  { id: "amber", label: "Bursztynowy", hex: "#F4B942" },
  { id: "sunny", label: "Słoneczny", hex: "#FFE066" },
  { id: "lime", label: "Limonkowy", hex: "#7FD000" },
  { id: "olive", label: "Oliwkowy", hex: "#708D23" },
  { id: "green", label: "Zielony", hex: "#2AA845" },
  { id: "emerald", label: "Szmaragdowy", hex: "#00B894" },
  { id: "mint", label: "Miętowy", hex: "#2EC4B6" },
  { id: "turquoise", label: "Turkusowy", hex: "#00A8E8" },
  { id: "blue", label: "Niebieski", hex: "#4361EE" },
  { id: "navy", label: "Kolor motywu", paletteKey: "headline" },
  { id: "deep-sea", label: "Morski", hex: "#264653" },
  { id: "lavender", label: "Lawendowy", hex: "#A88BFF" },
  { id: "violet", label: "Fioletowy", hex: "#6A0DAD" },
  { id: "magenta", label: "Purpurowy", hex: "#D0006F" },
  { id: "pink", label: "Różowy", hex: "#FF7AA2" },
  { id: "burgundy", label: "Burgundowy", hex: "#7D1128" },
  { id: "brown", label: "Brązowy", hex: "#8B5A2B" },
  { id: "copper", label: "Miedziany", hex: "#B87333" },
  { id: "gray", label: "Szary", hex: "#808080" },
];

function resolveCourseColor(
  color: CourseColorSource,
  palette: ThemeColors
): CourseColorOption {
  if (color.paletteKey) {
    return {
      id: color.id,
      label: color.label,
      hex: palette[color.paletteKey],
    };
  }

  return color;
}

function createCourseColors(palette: ThemeColors): CourseColorOption[] {
  return BASE_COURSE_COLORS.map((color) => resolveCourseColor(color, palette));
}

export const DEFAULT_COURSE_COLOR = themeMap.light.headline;

export function getDefaultCourseColor(theme: Theme): string {
  return themeMap[theme]?.headline ?? DEFAULT_COURSE_COLOR;
}

export function getCourseColorsForTheme(
  palette: ThemeColors
): CourseColorOption[] {
  return createCourseColors(palette);
}

export const COURSE_COLORS = createCourseColors(themeMap.light);

export type CourseIconComponent = ComponentType<{
  name: string;
  size?: number;
  color?: string;
}>;

export interface CourseIconDefinition {
  id: string;
  Component: CourseIconComponent;
  name: string;
}

export const COURSE_ICONS: CourseIconDefinition[] = [
  { id: "heart", Component: AntDesign, name: "heart" },
  { id: "coffee", Component: MaterialCommunityIcons, name: "coffee" },
  { id: "suitcase", Component: Entypo, name: "suitcase" },
  { id: "star", Component: AntDesign, name: "star" },
  { id: "house", Component: FontAwesome6, name: "house-chimney" },
  { id: "cloud", Component: AntDesign, name: "cloud" },
  { id: "eye", Component: AntDesign, name: "eye" },
  { id: "leaf", Component: Ionicons, name: "leaf" },
  { id: "book", Component: MaterialCommunityIcons, name: "book-open-variant" },
  { id: "music", Component: Ionicons, name: "musical-notes" },
  { id: "camera", Component: Entypo, name: "camera" },
  { id: "brain", Component: MaterialCommunityIcons, name: "brain" },
  { id: "lightbulb", Component: AntDesign, name: "bulb" },
  { id: "planet", Component: Ionicons, name: "planet" },
  { id: "puzzle", Component: MaterialCommunityIcons, name: "puzzle-outline" },
  { id: "globe", Component: MaterialCommunityIcons, name: "earth" },
  { id: "mountain", Component: MaterialCommunityIcons, name: "terrain" },
  { id: "compass", Component: MaterialCommunityIcons, name: "compass-outline" },
  { id: "dna", Component: MaterialCommunityIcons, name: "dna" },
  { id: "microscope", Component: MaterialCommunityIcons, name: "flask" },
  { id: "tree", Component: MaterialCommunityIcons, name: "pine-tree" },
  { id: "code", Component: MaterialCommunityIcons, name: "laptop" },
  { id: "chip", Component: MaterialCommunityIcons, name: "memory" },
  { id: "robot", Component: MaterialCommunityIcons, name: "robot-outline" },
];

export function getCourseIconById(id: string | null | undefined) {
  return COURSE_ICONS.find((icon) => icon.id === id) ?? null;
}

export function resolveCourseIconProps(
  iconId: string | undefined | null,
  iconColor: string
) {
  if (iconId?.startsWith("flag:")) {
    const langCode = iconId.split(":")[1];
    const flagSource = getFlagSource(langCode);
    if (flagSource) {
      return {
        mainImageSource: flagSource,
        icon: {
          Component: Ionicons, // Dummy component
          name: "grid-outline", // Dummy name
          color: iconColor,
          size: 60,
        },
      };
    }
  }

  const iconMeta = getCourseIconById(iconId);
  const IconComponent = iconMeta?.Component ?? Ionicons;
  const iconName = iconMeta?.name ?? "grid-outline";

  return {
    mainImageSource: undefined,
    icon: {
      Component: IconComponent,
      name: iconName,
      color: iconColor,
      size: 60,
    },
  };
}
