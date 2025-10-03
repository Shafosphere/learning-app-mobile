import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useStyles } from "./ReviewProfilesScreen-styles";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  countTotalDueReviews,
  getCustomProfilesWithCardCounts,
  type CustomProfileSummary,
} from "@/src/db/sqlite/db";
import { getProfileIconById } from "@/src/constants/customProfile";
import { getFlagSource } from "@/src/constants/languageFlags";
import type { SavedBoxesV2 } from "@/src/hooks/useBoxesPersistenceSnapshot";

const languageLabels: Record<string, Record<string, string>> = {
  pl: { en: "angielski", fr: "francuski", es: "hiszpański" },
};

async function readCustomDueCount(
  profileId: number,
  fallback: number
): Promise<number> {
  const storageKey = `customBoxes:${profileId}-${profileId}-custom-${profileId}`;
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as SavedBoxesV2 | null;
    if (!parsed || parsed.v !== 2 || !parsed.flashcards) {
      return fallback;
    }

    const {
      flashcards: { boxOne, boxTwo, boxThree, boxFour, boxFive },
    } = parsed;

    const lengths = [boxOne, boxTwo, boxThree, boxFour, boxFive].map((list) =>
      Array.isArray(list) ? list.length : 0
    );

    const total = lengths.reduce((sum, count) => sum + count, 0);
    return total;
  } catch (error) {
    console.warn(
      `Failed to read custom review snapshot for profile ${profileId}`,
      error
    );
    return fallback;
  }
}

export default function ReviewProfilesScreen() {
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
          const count = await readCustomDueCount(
            profile.id,
            profile.cardsCount
          );
          return [profile.id, count] as const;
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
        router.push("/flashcards_custom");
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
            <Text style={styles.sectionTitle}>Powtórki z głównych profili</Text>
            {profiles.map((profile, index) => {
              const builtInCount = builtInCounts[index] ?? 0;
              const targetFlag = getFlagSource(profile.targetLang);
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
                  <View style={styles.profileCardContent}>
                    {sourceFlag ? (
                      <Image style={styles.flag} source={sourceFlag} />
                    ) : null}
                    <Text style={styles.profileCardText}>{friendlyLabel}</Text>
                  </View>
                  {renderCount(builtInCount)}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Powtórki z twoich profili</Text>
            {customProfiles.length === 0 ? (
              <Text style={styles.emptyText}>
                Nie masz jeszcze własnych fiszek.
              </Text>
            ) : (
              <View style={styles.customList}>
                {customProfiles.map((profile) => {
                  const iconMeta = getProfileIconById(profile.iconId);
                  const IconComponent = iconMeta?.Component ?? Ionicons;
                  const iconName = (iconMeta?.name ?? "grid-outline") as never;
                  const dueCount =
                    customCounts[profile.id] ?? profile.cardsCount;

                  return (
                    <Pressable
                      key={profile.id}
                      style={styles.customCard}
                      onPress={() => handleSelectCustomProfile(profile.id)}
                    >
                      <View style={styles.customCardContent}>
                        <IconComponent
                          name={iconName}
                          size={60}
                          color={profile.iconColor}
                        />
                        <View style={styles.customCardInfo}>
                          <Text style={styles.customCardTitle}>
                            {profile.name}
                          </Text>
                          <Text style={styles.customCardMeta}>
                            fiszki: {profile.cardsCount}
                          </Text>
                        </View>
                      </View>
                      {renderCount(dueCount)}
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
