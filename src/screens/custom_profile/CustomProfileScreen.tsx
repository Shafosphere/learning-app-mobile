import { useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import MyButton from "@/src/components/button/button";
import ProfileIconColorSelector from "@/src/components/customProfile/ProfileIconColorSelector";
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
          <ProfileIconColorSelector
            selectedIcon={selectedIcon}
            selectedColor={selectedColor}
            selectedColorId={selectedColorId}
            onIconChange={setSelectedIcon}
            onColorChange={(color) => {
              setSelectedColor(color.hex);
              setSelectedColorId(color.id);
            }}
            styles={{
              iconsContainer: styles.imageContainer,
              iconWrapper: styles.iconWrapper,
              iconWrapperSelected: styles.iconWrapperSelected,
              colorsContainer: styles.colorsContainer,
              colorSwatch: styles.profileColor,
              colorSwatchSelected: styles.profileColorSelected,
            }}
          />
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
