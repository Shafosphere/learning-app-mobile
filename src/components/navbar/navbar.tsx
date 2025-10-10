import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  Platform,
  Pressable,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useStyles } from "./navbar-styles";
import { Image } from "expo-image";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useLearningStats } from "@/src/contexts/LearningStatsContext";
import { getFlagSource } from "@/src/constants/languageFlags";
import {
  getCustomProfileById,
  type CustomProfileRecord,
} from "@/src/db/sqlite/db";
import { getProfileIconById } from "@/src/constants/customProfile";

import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const logo = require("@/assets/illustrations/navbar/logo.png");
const watchIcon = require("@/assets/illustrations/navbar/watch.png");
const padIcon = require("@/assets/illustrations/navbar/pad.png");

export default function Navbar() {
  const router = useRouter();
  const {
    toggleTheme,
    activeCustomProfileId,
    selectedLevel,
    activeProfile,
    colors,
  } = useSettings();
  const { knownWordsCount } = useLearningStats();
  const styles = useStyles();
  const topPad = Platform.OS === "android" ? StatusBar.currentHeight : 0;
  const [customProfile, setCustomProfile] =
    useState<CustomProfileRecord | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (activeCustomProfileId == null) {
      setCustomProfile(null);
      return () => {
        isMounted = false;
      };
    }

    getCustomProfileById(activeCustomProfileId)
      .then((profile) => {
        if (isMounted) {
          setCustomProfile(profile);
        }
      })
      .catch((error) => {
        console.error("Failed to load active custom profile", error);
        if (isMounted) {
          setCustomProfile(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeCustomProfileId]);

  const profileFlagSource = useMemo(() => {
    if (!activeProfile || !activeProfile.sourceLang) {
      return undefined;
    }

    return getFlagSource(activeProfile.sourceLang);
  }, [activeProfile]);

  const profileAccessibilityLabel = useMemo(() => {
    if (customProfile) {
      return `Profil ${customProfile.name}. Otwórz panel profili.`;
    }

    if (activeProfile?.sourceLang && activeProfile?.targetLang) {
      return `Profil ${activeProfile.sourceLang.toUpperCase()} do ${activeProfile.targetLang.toUpperCase()}. Otwórz panel profilu.`;
    }

    return "Wybierz profil językowy";
  }, [activeProfile, customProfile]);

  const profileIconMeta = useMemo(() => {
    if (!customProfile) return null;
    return getProfileIconById(customProfile.iconId);
  }, [customProfile]);

  const CustomProfileIcon = profileIconMeta?.Component;
  const customProfileIconName = profileIconMeta?.name ?? "grid-outline";
  const customProfileIconColor = customProfile?.iconColor ?? colors.headline;

  const profileGraphic =
    activeCustomProfileId != null && customProfile ? (
      <View style={styles.customProfileIconWrapper}>
        {CustomProfileIcon ? (
          <CustomProfileIcon
            name={customProfileIconName as never}
            size={24}
            color={customProfileIconColor}
          />
        ) : (
          <Ionicons
            name="person-circle-outline"
            size={24}
            color={colors.headline}
          />
        )}
      </View>
    ) : profileFlagSource ? (
      <Image source={profileFlagSource} style={styles.profileFlag} />
    ) : (
      <Ionicons
        name="person-circle-outline"
        size={24}
        color={colors.headline}
      />
    );

  const handlePadPress = () => {
    if (activeCustomProfileId != null) {
      router.push("/flashcards_custom");
      return;
    }

    const hasProfile =
      activeProfile?.sourceLangId != null &&
      activeProfile?.targetLangId != null;

    if (hasProfile && selectedLevel) {
      router.push("/flashcards");
      return;
    }

    router.push("/level");
  };

  return (
    <View style={[styles.container, { marginTop: topPad }]}>
      <View style={styles.leftGroup}>
        <TouchableOpacity
          onPress={() => router.push("/profilpanel")}
          style={styles.profileButton}
          accessibilityRole="button"
          accessibilityLabel={profileAccessibilityLabel}
        >
          {profileGraphic}
          {activeCustomProfileId != null && customProfile ? (
            <Text
              style={styles.profileName}
              numberOfLines={1}
              ellipsizeMode="tail"
              allowFontScaling
            >
              {customProfile.name}
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>

      <View style={styles.centerGroup}>
        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.iconButtonPressed,
          ]}
          onPress={() => router.push("/review")}
          accessibilityRole="button"
          accessibilityLabel="Przejdź do powtórek"
        >
          <Image
            source={watchIcon}
            style={styles.centerIcon}
            contentFit="contain"
          />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.iconButtonPressed,
          ]}
          onPress={handlePadPress}
          accessibilityRole="button"
          accessibilityLabel="Przejdź do gry fiszek"
        >
          <Image
            source={padIcon}
            style={styles.centerIcon}
            contentFit="contain"
          />
        </Pressable>

        <View pointerEvents="box-none" style={styles.logoWrapper}>
          <TouchableOpacity
            onPress={() => router.push("/")}
            style={styles.logoButton}
            accessibilityRole="button"
            accessibilityLabel="Przejdź do strony głównej"
          >
            <Image source={logo} style={styles.logo} contentFit="contain" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.rightGroup}>
        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.iconButtonPressed,
          ]}
          onPress={toggleTheme}
        >
          <MaterialIcons
            style={styles.icon}
            name="dark-mode"
            size={24}
            color={colors.headline}
          />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.iconButtonPressed,
          ]}
          onPress={() => router.push("/settings")}
        >
          <Ionicons
            style={styles.icon}
            name="settings-sharp"
            size={24}
            color={colors.headline}
          />
        </Pressable>
      </View>

      {/* <View style={styles.rightGroup}>
        <Text style={styles.counterText}>{knownWordsCount}</Text>
      </View> */}
    </View>
  );
}
