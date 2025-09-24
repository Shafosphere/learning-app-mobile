import { type ComponentType, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import MyButton from "@/src/components/button/button";
import { useStyles } from "@/src/screens/custom_profile/styles_custom_profile";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useRouter } from "expo-router";

import Entypo from "@expo/vector-icons/Entypo";
import AntDesign from "@expo/vector-icons/AntDesign";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Ionicons from "@expo/vector-icons/Ionicons";

const DEFAULT_PROFILE_COLOR = "#00214D";

const PROFILE_COLORS = [
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

type IconComponent = ComponentType<{
  name: string;
  size?: number;
  color?: string;
}>;

const PROFILE_ICONS: { id: string; Component: IconComponent; name: string }[] =
  [
    { id: "heart", Component: AntDesign, name: "heart" },
    { id: "coffee", Component: MaterialCommunityIcons, name: "coffee" },
    { id: "suitcase", Component: Entypo, name: "suitcase" },
    { id: "star", Component: AntDesign, name: "star" },
    { id: "house", Component: FontAwesome6, name: "house-chimney" },
    { id: "cloud", Component: AntDesign, name: "cloud" },
    { id: "eye", Component: AntDesign, name: "eye" },
    { id: "leaf", Component: Ionicons, name: "leaf" },
    {
      id: "book",
      Component: MaterialCommunityIcons,
      name: "book-open-variant",
    },
    { id: "music", Component: Ionicons, name: "musical-notes" },
    { id: "camera", Component: Entypo, name: "camera" },
    { id: "brain", Component: MaterialCommunityIcons, name: "brain" },
    { id: "lightbulb", Component: AntDesign, name: "bulb1" },
    { id: "planet", Component: Ionicons, name: "planet" },
    { id: "puzzle", Component: MaterialCommunityIcons, name: "puzzle-outline" },
  ];
export default function CustomProfileScreen() {
  const styles = useStyles();
  const { colors } = useSettings();
  const router = useRouter();
  const [selectedColor, setSelectedColor] = useState(DEFAULT_PROFILE_COLOR);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(
    PROFILE_ICONS[0]?.id ?? null
  );

  const handleNavigateToContent = () => {
    router.push("/custom_profile/content");
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Profil</Text>

          <View>
            <Text style={styles.miniSectionHeader}>nazwa</Text>
            <TextInput style={styles.profileInput}></TextInput>
          </View>

          <View style={styles.iconContainer}>
            <Text style={styles.miniSectionHeader}>ikona</Text>
            <View style={styles.imageContainer}>
              {PROFILE_ICONS.map(({ id, Component, name }) => (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityLabel={`Ikona ${name}`}
                  onPress={() => setSelectedIcon(id)}
                  style={[
                    styles.iconWrapper,
                    selectedIcon === id && styles.iconWrapperSelected,
                  ]}
                >
                  <Component
                    name={name as never}
                    size={40}
                    color={selectedColor}
                  />
                </Pressable>
              ))}
            </View>

            <View style={styles.colorsContainer}>
              {PROFILE_COLORS.map((color) => (
                <Pressable
                  key={color.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Kolor ${color.label}`}
                  onPress={() => setSelectedColor(color.hex)}
                  style={[
                    styles.profileColor,
                    { backgroundColor: color.hex },
                    selectedColor === color.hex && styles.profileColorSelected,
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <View style={styles.footerActionRight}>
          <MyButton
            text="->"
            color="my_green"
            onPress={handleNavigateToContent}
            accessibilityLabel="Przejdź do ustawień zawartości profilu"
          />
        </View>
      </View>
    </View>
  );
}
