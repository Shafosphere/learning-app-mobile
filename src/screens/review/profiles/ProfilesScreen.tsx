import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useStyles } from "./ProfilesScreen-styles";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  countDueCustomReviews,
  countTotalDueReviews,
  getCustomProfilesWithCardCounts,
  type CustomProfileSummary,
} from "@/src/db/sqlite/db";
import { getProfileIconById } from "@/src/constants/customProfile";
import { getFlagSource } from "@/src/constants/languageFlags";

const languageLabels: Record<string, Record<string, string>> = {
  pl: { en: "angielski", fr: "francuski", es: "hiszpański" },
};

export default function ProfilesScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { profiles, setActiveProfileIdx, setActiveCustomProfileId, colors } =
    useSettings();

  const [builtInCounts, setBuiltInCounts] = useState<Record<number, number>>(
    {}
  );
  const [customProfiles, setCustomProfiles] = useState<CustomProfileSummary[]>(
    []
  );
  const [customCounts, setCustomCounts] = useState<Record<number, number>>({});

  const refreshData = useCallback(async () => {
    const now = Date.now();

    const builtInEntries = await Promise.all(
      profiles.map(async (profile, index) => {
        if (profile.sourceLangId == null || profile.targetLangId == null) {
          return [index, 0] as const;
        }
        try {
          const count = await countTotalDueReviews(
            profile.sourceLangId,
            profile.targetLangId,
            now
          );
          return [index, count] as const;
        } catch (error) {
          console.warn(
            `Failed to count reviews for profile ${profile.sourceLangId}-${profile.targetLangId}`,
            error
          );
          return [index, 0] as const;
        }
      })
    );

    const nextBuiltIn: Record<number, number> = {};
    for (const [idx, count] of builtInEntries) {
      nextBuiltIn[idx] = count;
    }
    setBuiltInCounts(nextBuiltIn);

    try {
      const rows = await getCustomProfilesWithCardCounts();
      setCustomProfiles(rows);
      const customEntries = await Promise.all(
        rows.map(async (profile) => {
          if (!profile.reviewsEnabled) {
            return [profile.id, 0] as const;
          }
          try {
            const count = await countDueCustomReviews(profile.id, now);
            return [profile.id, count] as const;
          } catch (error) {
            console.warn(
              `Failed to count custom reviews for profile ${profile.id}`,
              error
            );
            return [profile.id, 0] as const;
          }
        })
      );
      const nextCustom: Record<number, number> = {};
      for (const [id, count] of customEntries) {
        nextCustom[id] = count;
      }
      setCustomCounts(nextCustom);
    } catch (error) {
      console.error("Failed to load custom profile counts", error);
      setCustomProfiles([]);
      setCustomCounts({});
    }
  }, [profiles]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const load = async () => {
        try {
          await refreshData();
        } catch (error) {
          console.error("Failed to refresh review profiles", error);
        }
      };

      if (isMounted) void load();

      return () => {
        isMounted = false;
      };
    }, [refreshData])
  );

  const handleSelectProfile = useCallback(
    (index: number) => {
      void (async () => {
        await setActiveProfileIdx(index);
        router.push("/review/levels");
      })();
    },
    [router, setActiveProfileIdx]
  );

  const handleSelectCustomProfile = useCallback(
    (profileId: number) => {
      void (async () => {
        await setActiveCustomProfileId(profileId);
        router.push("/review/memory");
      })();
    },
    [router, setActiveCustomProfileId]
  );

  const renderCount = (count: number) => (
    // <View style={styles.countBadge}>
    <Text
      style={[
        styles.countNumber,
        { color: count > 0 ? colors.my_red : colors.my_green },
      ]}
    >
      {count}
    </Text>
    // </View>
  );

  const visibleCustomProfiles = customProfiles.filter(
    (profile) => profile.reviewsEnabled
  );
  const hasCustomProfiles = customProfiles.length > 0;
  const hasVisibleCustomProfiles = visibleCustomProfiles.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.minicontainer}>
          {/* <Text style={styles.title}>Powtórki</Text> */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Powtórki</Text>
            <View style={styles.profileGrid}>
              {profiles.map((profile, index) => {
                const builtInCount = builtInCounts[index] ?? 0;
                const sourceFlag = getFlagSource(profile.sourceLang);
                const friendlyLabel =
                  languageLabels[profile.targetLang]?.[profile.sourceLang] ??
                  profile.sourceLang;

                return (
                  <Pressable
                    key={`${profile.sourceLang}-${profile.targetLang}-${index}`}
                    style={styles.profileCard}
                    onPress={() => handleSelectProfile(index)}
                  >
                    {/* <View style={styles.profileCardContent}> */}
                    {sourceFlag ? (
                      <Image style={styles.flag} source={sourceFlag} />
                    ) : null}
                    <Text style={styles.profileCardText}>{friendlyLabel}</Text>
                    {/* </View> */}
                    <View style={styles.profileCount}>
                      {renderCount(builtInCount)}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Twoje</Text>
            {!hasCustomProfiles ? (
              <Text style={styles.emptyText}>
                Nie masz jeszcze własnych fiszek.
              </Text>
            ) : !hasVisibleCustomProfiles ? (
              <Text style={styles.emptyText}>
                Wszystkie profile mają wyłączone powtórki.
              </Text>
            ) : (
              <View style={styles.profileGrid}>
                {visibleCustomProfiles.map((profile, index) => {
                  const iconMeta = getProfileIconById(profile.iconId);
                  const IconComponent = iconMeta?.Component ?? Ionicons;
                  const iconName = (iconMeta?.name ?? "grid-outline") as never;
                  const dueCount = customCounts[profile.id] ?? 0;

                  return (
                    <Pressable
                      key={`${profile.id}-${index}`}
                      style={styles.profileCard}
                      onPress={() => handleSelectCustomProfile(profile.id)}
                    >
                      <IconComponent
                        name={iconName}
                        size={48}
                        color={profile.iconColor}
                      />
                      <Text style={styles.profileCardText}>{profile.name}</Text>
                      <View style={styles.profileCount}>
                        {renderCount(dueCount)}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
