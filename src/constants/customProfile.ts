import { type ComponentType } from "react";
import AntDesign from "@expo/vector-icons/AntDesign";
import Entypo from "@expo/vector-icons/Entypo";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

export const DEFAULT_PROFILE_COLOR = "#00214D";

export const PROFILE_COLORS = [
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
  { id: "navy", label: "Granatowy", hex: DEFAULT_PROFILE_COLOR },
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

export type ProfileIconComponent = ComponentType<{
  name: string;
  size?: number;
  color?: string;
}>;

export interface ProfileIconDefinition {
  id: string;
  Component: ProfileIconComponent;
  name: string;
}

export const PROFILE_ICONS: ProfileIconDefinition[] = [
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
  { id: "lightbulb", Component: AntDesign, name: "bulb1" },
  { id: "planet", Component: Ionicons, name: "planet" },
  { id: "puzzle", Component: MaterialCommunityIcons, name: "puzzle-outline" },
];

export function getProfileIconById(id: string | null | undefined) {
  return PROFILE_ICONS.find((icon) => icon.id === id) ?? null;
}

