// ProfilPanel.tsx
import { useStyles } from "@/src/screens/profilpanel/styles_profilpanel";
import { Image, Text, View, Pressable } from "react-native";
import Entypo from "@expo/vector-icons/Entypo";
import Ionicons from "@expo/vector-icons/Ionicons";
import AntDesign from "@expo/vector-icons/AntDesign";
import PL_FLAG from "../../assets/flag/PL.png";
import ES_FLAG from "../../assets/flag/ES.png";
import PM_FLAG from "../../assets/flag/PM.png";
import US_FLAG from "../../assets/flag/US.png";
import { useCallback, useEffect, useState } from "react";
import { useSettings } from "@/src/contexts/SettingsContext";
import MyButton from "@/src/components/button/button";
import { useRouter } from "expo-router";
import { usePopup } from "@/src/contexts/PopupContext";
import { useFocusEffect } from "@react-navigation/native";
import {
  getCustomProfilesWithCardCounts,
  type CustomProfileSummary,
} from "@/src/components/db/db";
import { getProfileIconById } from "@/src/constants/customProfile";

type SelectedProfile =
  | { type: "builtin"; index: number }
  | { type: "custom"; id: number };

export default function ProfilPanel() {
  const {
    profiles,
    activeProfileIdx, // ⬅️ bierzemy z contextu
    setActiveProfileIdx, // ⬅️ setter z contextu
    activeProfile, // (opcjonalnie do logów)
    activeCustomProfileId,
    setActiveCustomProfileId,
    colors,
  } = useSettings();

  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile | null>(
    null
  );
  const [committedProfile, setCommittedProfile] =
    useState<SelectedProfile | null>(null);
  const [customProfiles, setCustomProfiles] = useState<CustomProfileSummary[]>(
    []
  );
  const router = useRouter();
  const setPopup = usePopup();

  const flagMap: Record<string, number> = {
    pl: PL_FLAG,
    es: ES_FLAG,
    pm: PM_FLAG,
    en: US_FLAG,
  };

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
      <View style={styles.minicontainer}>
        <Text style={styles.title}>Twoje profile</Text>

        {profiles.map((item, index) => {
          const highlightProfile = selectedProfile ?? committedProfile;
          const isHighlighted =
            highlightProfile?.type === "builtin" &&
            highlightProfile.index === index;
          return (
            <Pressable
              key={index}
              onPress={() =>
                setSelectedProfile({ type: "builtin", index })
              }
              style={[
                styles.profilecontainer,
                isHighlighted && styles.clicked,
              ]}
            >
              <Image style={styles.flag} source={flagMap[item.targetLang]} />
              <Entypo style={styles.arrow} name="arrow-long-right" size={90} />
              <Image style={styles.flag} source={flagMap[item.sourceLang]} />
            </Pressable>
          );
        })}

        <View style={styles.customSection}>
          <Text style={styles.customSectionTitle}>Własne profile</Text>
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
                    style={[
                      styles.customCard,
                      isHighlighted && styles.customCardSelected,
                    ]}
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
                          size={28}
                          color={profile.iconColor}
                        />
                      </View>
                      <View style={styles.customCardInfo}>
                        <Text style={styles.customCardTitle}>
                          {profile.name}
                        </Text>
                        <Text style={styles.customCardMeta}>
                          Fiszki: {profile.cardsCount}
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
                      <AntDesign
                        name="edit"
                        size={20}
                        color={colors.headline}
                      />
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

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
              text="zatwierdź"
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

          <View style={styles.buttonsRow}>
            <MyButton
              text="własny"
              color="my_yellow"
              onPress={() => router.push("/custom_profile")}
              disabled={false}
              width={130}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
