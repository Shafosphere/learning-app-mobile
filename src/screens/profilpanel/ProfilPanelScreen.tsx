import { useStyles } from "./ProfilPanelScreen-styles";
import { Image, Text, View, Pressable, ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useState } from "react";
import { useSettings } from "@/src/contexts/SettingsContext";
import MyButton from "@/src/components/button/button";
import { useRouter } from "expo-router";
import { usePopup } from "@/src/contexts/PopupContext";
import { useFocusEffect } from "@react-navigation/native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import {
  getCustomProfilesWithCardCounts,
  type CustomProfileSummary,
} from "@/src/db/sqlite/db";
import { getProfileIconById } from "@/src/constants/customProfile";
import { getFlagSource } from "@/src/constants/languageFlags";

type SelectedProfile =
  | { type: "builtin"; index: number }
  | { type: "custom"; id: number };

export default function ProfilPanelScreen() {
  const {
    profiles,
    activeProfileIdx,
    setActiveProfileIdx,
    activeProfile,
    activeCustomProfileId,
    setActiveCustomProfileId,
    colors,
  } = useSettings();

  const lang: Record<string, Record<string, string>> = {
    pl: { en: "angielski", fr: "francuski", es: "hiszpański" },
  };

  const [selectedProfile, setSelectedProfile] =
    useState<SelectedProfile | null>(null);
  const [committedProfile, setCommittedProfile] =
    useState<SelectedProfile | null>(null);
  const [customProfiles, setCustomProfiles] = useState<CustomProfileSummary[]>(
    []
  );
  const router = useRouter();
  const setPopup = usePopup();

  useEffect(() => {
    console.log("profiles length:", profiles.length);
    console.log("profiles:", JSON.stringify(profiles, null, 2));
    console.log(
      "activeProfileIdx:",
      activeProfileIdx,
      "activeProfile:",
      activeProfile,
      "activeCustomProfileId:",
      activeCustomProfileId
    );
  }, [profiles, activeProfileIdx, activeProfile, activeCustomProfileId]);

  useEffect(() => {
    if (activeProfileIdx != null) {
      setCommittedProfile({ type: "builtin", index: activeProfileIdx });
      return;
    }
    if (activeCustomProfileId != null) {
      setCommittedProfile({ type: "custom", id: activeCustomProfileId });
      return;
    }
    setCommittedProfile(null);
  }, [activeProfileIdx, activeCustomProfileId]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      getCustomProfilesWithCardCounts()
        .then((rows) => {
          if (isMounted) setCustomProfiles(rows);
        })
        .catch((error) => {
          console.error("Failed to load custom profiles", error);
        });
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const styles = useStyles();

  const handleClick = () => {
    setPopup({
      message: "Zapisano pomyślnie!",
      color: "my_green",
      duration: 3000,
    });
  };

  const confirmSelection = async () => {
    if (!selectedProfile) return;

    if (selectedProfile.type === "builtin") {
      await setActiveProfileIdx(selectedProfile.index);
    } else {
      await setActiveCustomProfileId(selectedProfile.id);
    }

    setSelectedProfile(null);
  };

  const handleEditCustomProfile = (profile: CustomProfileSummary) => {
    const encodedName = encodeURIComponent(profile.name);
    router.push(
      `/custom_profile/edit?id=${profile.id.toString()}&name=${encodedName}`
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.minicontainer}>
          <Text style={styles.title}>Stworzone przez nas</Text>

          {profiles.map((item, index) => {
            const highlightProfile = selectedProfile ?? committedProfile;
            const isHighlighted =
              highlightProfile?.type === "builtin" &&
              highlightProfile.index === index;
            const targetFlag = getFlagSource(item.targetLang);
            const sourceFlag = getFlagSource(item.sourceLang);
            return (
              <Pressable
                key={index}
                onPress={() => setSelectedProfile({ type: "builtin", index })}
                style={[styles.profileCard, isHighlighted && styles.clicked]}
              >
                {targetFlag ? (
                  <View style={styles.profileCardBadge}>
                    <Image
                      style={styles.profileCardBadgeFlag}
                      source={targetFlag}
                    />
                    <Text style={styles.profileCardBadgeText}>
                      {item.targetLang?.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
                {sourceFlag ? (
                  <Image style={styles.flag} source={sourceFlag} />
                ) : null}
                <Text style={styles.profileCardText}>
                  {lang[item.targetLang]?.[item.sourceLang] ?? item.sourceLang}
                </Text>
              </Pressable>
            );
          })}

          <View style={styles.customSection}>
            <Text style={styles.customSectionTitle}>Stworzone przez Ciebie</Text>
            {customProfiles.length === 0 ? (
              <Text style={styles.customEmptyText}>
                Nie masz jeszcze własnych fiszek.
              </Text>
            ) : (
              <View style={styles.customList}>
                {customProfiles.map((profile) => {
                  const iconMeta = getProfileIconById(profile.iconId);
                  const IconComponent = iconMeta?.Component ?? Ionicons;
                  const iconName = (iconMeta?.name ?? "grid-outline") as never;
                  const highlightProfile = selectedProfile ?? committedProfile;
                  const isHighlighted =
                    highlightProfile?.type === "custom" &&
                    highlightProfile.id === profile.id;
                  return (
                    <Pressable
                      key={profile.id}
                      onPress={() =>
                        setSelectedProfile({ type: "custom", id: profile.id })
                      }
                      style={[styles.customCard, isHighlighted && styles.clicked]}
                    >
                      <View style={styles.customCardContent}>
                        <View
                          style={[
                            styles.customIconBadge,
                            { borderColor: profile.iconColor },
                          ]}
                        >
                          <IconComponent
                            name={iconName}
                            size={60}
                            color={profile.iconColor}
                          />
                        </View>
                        <View style={styles.customCardInfo}>
                          <Text style={styles.customCardTitle}>
                            {profile.name}
                          </Text>
                          <Text style={styles.customCardMeta}>
                            fiszki: {profile.cardsCount}
                          </Text>
                        </View>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Edytuj profil ${profile.name}`}
                        style={styles.customEditButton}
                        onPress={(event) => {
                          event.stopPropagation();
                          handleEditCustomProfile(profile);
                        }}
                      >
                        <FontAwesome6
                          name="edit"
                          size={24}
                          color={colors.headline}
                        />
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonscontainer}>
        <View style={styles.buttonsRow}>
          <MyButton
            text="nowy"
            color="my_yellow"
            onPress={() => router.push("/createprofile")}
            disabled={false}
            width={70}
          />

          <MyButton
            text="aktywuj"
            color="my_green"
            onPress={() => {
              confirmSelection();
              handleClick();
            }}
            disabled={
              !selectedProfile ||
              (selectedProfile.type === "builtin" &&
                committedProfile?.type === "builtin" &&
                committedProfile.index === selectedProfile.index) ||
              (selectedProfile.type === "custom" &&
                committedProfile?.type === "custom" &&
                committedProfile.id === selectedProfile.id)
            }
          />
        </View>
      </View>
    </View>
  );
}
