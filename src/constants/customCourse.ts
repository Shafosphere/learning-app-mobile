import {
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

export function getCourseColorsForTheme(
  palette: ThemeColors
): CourseColorOption[] {
  return createCourseColors(palette);
}

type CourseIconComponent = ComponentType<any>;

interface CourseIconDefinition {
  id: string;
  Component: CourseIconComponent;
  name: string;
  category:
    | "general"
    | "science"
    | "travel"
    | "tech"
    | "lifestyle"
    | "sport";
}

export const COURSE_ICONS: CourseIconDefinition[] = [
  { id: "heart", Component: AntDesign, name: "heart", category: "lifestyle" },
  { id: "star", Component: AntDesign, name: "star", category: "general" },
  { id: "house", Component: FontAwesome6, name: "house-chimney", category: "general" },
  { id: "cloud", Component: AntDesign, name: "cloud", category: "general" },
  { id: "eye", Component: AntDesign, name: "eye", category: "general" },
  { id: "leaf", Component: Ionicons, name: "leaf", category: "science" },
  { id: "book", Component: MaterialCommunityIcons, name: "book-open-variant", category: "science" },
  { id: "music", Component: Ionicons, name: "musical-notes", category: "lifestyle" },
  { id: "camera", Component: Entypo, name: "camera", category: "lifestyle" },
  { id: "brain", Component: MaterialCommunityIcons, name: "brain", category: "science" },
  { id: "lightbulb", Component: AntDesign, name: "bulb", category: "science" },
  { id: "planet", Component: Ionicons, name: "planet", category: "science" },
  { id: "puzzle", Component: MaterialCommunityIcons, name: "puzzle-outline", category: "general" },
  { id: "flag", Component: AntDesign, name: "flag", category: "travel" },
  { id: "globe", Component: MaterialCommunityIcons, name: "earth", category: "travel" },
  { id: "mountain", Component: MaterialCommunityIcons, name: "terrain", category: "travel" },
  { id: "compass", Component: MaterialCommunityIcons, name: "compass-outline", category: "travel" },
  { id: "dna", Component: MaterialCommunityIcons, name: "dna", category: "science" },
  { id: "microscope", Component: MaterialCommunityIcons, name: "flask", category: "science" },
  { id: "tree", Component: MaterialCommunityIcons, name: "pine-tree", category: "science" },
  { id: "code", Component: MaterialCommunityIcons, name: "laptop", category: "tech" },
  { id: "chip", Component: MaterialCommunityIcons, name: "memory", category: "tech" },
  { id: "robot", Component: MaterialCommunityIcons, name: "robot-outline", category: "tech" },
  { id: "coffee", Component: MaterialCommunityIcons, name: "coffee", category: "lifestyle" },
  { id: "school", Component: Ionicons, name: "school", category: "science" },
  { id: "calculator", Component: Ionicons, name: "calculator", category: "science" },
  { id: "language", Component: Ionicons, name: "language", category: "science" },
  { id: "airplane", Component: Ionicons, name: "airplane", category: "travel" },
  { id: "train", Component: Ionicons, name: "train", category: "travel" },
  { id: "car", Component: Ionicons, name: "car-sport", category: "travel" },
  { id: "map", Component: Ionicons, name: "map", category: "travel" },
  { id: "rocket", Component: Ionicons, name: "rocket", category: "tech" },
  { id: "construct", Component: Ionicons, name: "construct", category: "tech" },
  { id: "gamepad", Component: Ionicons, name: "game-controller", category: "tech" },
  { id: "palette", Component: Ionicons, name: "color-palette", category: "lifestyle" },
  { id: "mic", Component: Ionicons, name: "mic", category: "lifestyle" },
  { id: "headset", Component: Ionicons, name: "headset", category: "lifestyle" },
  { id: "stats", Component: Ionicons, name: "stats-chart", category: "tech" },
  { id: "briefcase", Component: Ionicons, name: "briefcase", category: "general" },
  { id: "people", Component: Ionicons, name: "people", category: "general" },
  { id: "trophy", Component: Ionicons, name: "trophy", category: "sport" },
  { id: "medal", Component: Ionicons, name: "medal", category: "sport" },
  { id: "football", Component: Ionicons, name: "football", category: "sport" },
  { id: "basketball", Component: Ionicons, name: "basketball", category: "sport" },
  { id: "barbell", Component: Ionicons, name: "barbell", category: "sport" },
  { id: "fitness", Component: Ionicons, name: "fitness", category: "sport" },
  { id: "shield", Component: Ionicons, name: "shield-checkmark", category: "tech" },
  { id: "sparkles", Component: Ionicons, name: "sparkles", category: "general" },
  { id: "paw", Component: Ionicons, name: "paw", category: "lifestyle" },
  { id: "pizza", Component: Ionicons, name: "pizza", category: "lifestyle" },
  { id: "suitcase", Component: Entypo, name: "suitcase", category: "travel" },
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
