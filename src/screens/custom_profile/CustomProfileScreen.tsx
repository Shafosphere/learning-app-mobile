import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import MyButton from "@/src/components/button/button";
import { useStyles } from "./CustomProfileScreen-styles";
import { useRouter } from "expo-router";
import {
  DEFAULT_PROFILE_COLOR,
  PROFILE_COLORS,
  PROFILE_ICONS,
} from "@/src/constants/customProfile";
export default function CustomProfileScreen() {
  const styles = useStyles();
  const router = useRouter();
  const defaultColor = useMemo(
    () =>
      PROFILE_COLORS.find((color) => color.hex === DEFAULT_PROFILE_COLOR) ??
      PROFILE_COLORS[0],
    []
  );
  const [profileName, setProfileName] = useState("");
  const [selectedColor, setSelectedColor] = useState(
    defaultColor?.hex ?? DEFAULT_PROFILE_COLOR
  );
  const [selectedColorId, setSelectedColorId] = useState(
    defaultColor?.id ?? PROFILE_COLORS[0]?.id ?? ""
  );
  const [selectedIcon, setSelectedIcon] = useState<string | null>(
    PROFILE_ICONS[0]?.id ?? null
  );

  const handleNavigateToContent = () => {
    const name = profileName.trim();
    if (!selectedIcon || !name) {
      return;
    }
    const params: Record<string, string> = {
      name,
      iconId: selectedIcon,
      iconColor: selectedColor,
    };
    if (selectedColorId) {
      params.colorId = selectedColorId;
    }
    router.push({ pathname: "/custom_profile/content", params });
  };

  const nextDisabled = !profileName.trim() || !selectedIcon;

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Profiil</Text>

        <View>
          <Text style={styles.miniSectionHeader}>nazwa</Text>
          <TextInput
            style={styles.profileInput}
            value={profileName}
            onChangeText={setProfileName}
            placeholder="np. Fiszki podróżnicze"
            accessibilityLabel="Nazwa profilu"
          />
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
                onPress={() => {
                  setSelectedColor(color.hex);
                  setSelectedColorId(color.id);
                }}
                style={[
                  styles.profileColor,
                  { backgroundColor: color.hex },
                  selectedColor === color.hex && styles.profileColorSelected,
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.buttonscontainer}>
          <MyButton
            text="->"
            color="my_green"
            onPress={handleNavigateToContent}
            accessibilityLabel="Przejdź do ustawień zawartości profilu"
            disabled={nextDisabled}
          />
        </View>
      </View>

      {/* <View style={styles.divider} /> */}

      {/* <View style={styles.footer}>
        <View style={styles.footerActionRight}>
          <MyButton
            text="->"
            color="my_green"
            onPress={handleNavigateToContent}
            accessibilityLabel="Przejdź do ustawień zawartości profilu"
            disabled={nextDisabled}
          />
        </View>
      </View> */}
    </View>
  );
}
