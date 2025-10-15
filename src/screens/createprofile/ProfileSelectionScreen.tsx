import { useCallback, useMemo, useState } from "react";
import {
  GestureResponderEvent,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Octicons from "@expo/vector-icons/Octicons";
import { useStyles } from "./ProfileSelectionScreen-styles";
import { useSettings } from "@/src/contexts/SettingsContext";
import { getFlagSource } from "@/src/constants/languageFlags";
import type { LanguageProfile } from "@/src/types/profile";
import MyButton from "@/src/components/button/button";
import { useRouter } from "expo-router";

const placeholderProfiles: LanguageProfile[] = [
  { sourceLang: "pl", targetLang: "en" },
  { sourceLang: "pl", targetLang: "fr" },
  { sourceLang: "pl", targetLang: "es" },
  { sourceLang: "pl", targetLang: "de" },
];

const languageLabels: Record<string, string> = {
  pl: "polski",
  en: "angielski",
  fr: "francuski",
  es: "hiszpański",
  de: "niemiecki",
};

export default function ProfileSelectionScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { profiles, colors } = useSettings();

  const builtinProfiles = useMemo(
    () => (profiles.length > 0 ? profiles : placeholderProfiles),
    [profiles]
  );
  const usingPlaceholder = profiles.length === 0;

  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);

  const handlePinToggle = useCallback(
    (index: number) => {
      setPinnedIndex((current) => {
        const nextPinned = current === index ? null : index;

        if (usingPlaceholder) {
          console.log(
            `[ProfileSelection] Placeholder pin toggle: ${index} -> ${nextPinned}`
          );
        }

        return nextPinned;
      });
    },
    [usingPlaceholder]
  );

  const handlePinPress = useCallback(
    (event: GestureResponderEvent, index: number) => {
      event.stopPropagation();
      handlePinToggle(index);
    },
    [handlePinToggle]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.minicontainer}>
          <Text style={styles.title}>Czego sie uczymy?</Text>

          {builtinProfiles.map((profile, index) => {
            const sourceFlag = getFlagSource(profile.sourceLang);
            const targetFlag = getFlagSource(profile.targetLang);
            const isPinned = pinnedIndex === index;
            const isHighlighted = isPinned;

            const sourceLabel =
              languageLabels[profile.sourceLang] ??
              profile.sourceLang.toUpperCase();
            const targetLabel =
              languageLabels[profile.targetLang] ??
              profile.targetLang.toUpperCase();

            return (
              <Pressable
                key={`${profile.sourceLang}-${profile.targetLang}-${index}`}
                onPress={() => handlePinToggle(index)}
                style={[
                  styles.profileCard,
                  isHighlighted && styles.clicked,
                ]}
              >
                {targetFlag ? (
                  <View style={styles.profileCardBadge}>
                    <Image
                      style={styles.profileCardBadgeFlag}
                      source={targetFlag}
                    />
                    <Text style={styles.profileCardBadgeText}>
                      {profile.targetLang?.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
                {sourceFlag ? (
                  <Image style={styles.flag} source={sourceFlag} />
                ) : null}
                <Text style={styles.profileCardText}>
                  {`${sourceLabel} → ${targetLabel}`}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isPinned
                      ? `Odepnij profil ${targetLabel}`
                      : `Przypnij profil ${targetLabel}`
                  }
                  style={styles.pinButton}
                  onPress={(event) => handlePinPress(event, index)}
                >
                  <View
                    style={[
                      styles.pinCheckbox,
                      isPinned && styles.pinCheckboxActive,
                    ]}
                  >
                    <Octicons
                      name="pin"
                      size={20}
                      color={isPinned ? colors.background : colors.headline}
                    />
                  </View>
                </Pressable>
              </Pressable>
            );
          })}

          <Text style={styles.footerNote}>kiedys bedzie tu ich wiecej :)</Text>
        </View>
      </ScrollView>

      <View style={styles.buttonscontainer}>
        <View style={styles.buttonsRow}>
          <MyButton
            text="własny"
            color="my_yellow"
            onPress={() => router.push("/custom_profile")}
            disabled={false}
            width={90}
          />
        </View>
      </View>
    </View>
  );
}
