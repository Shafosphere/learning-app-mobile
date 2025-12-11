import { ACHIEVEMENTS } from "@/src/constants/achievements";
import {
    checkStreakAchievement,
    getUnlockedAchievements,
    UserAchievement,
} from "@/src/db/sqlite/repositories/achievements";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

// Global variable to store session streak
let globalSessionStreak = 0;

export function useAchievements() {
    const [unlocked, setUnlocked] = useState<UserAchievement[]>([]);

    const refreshAchievements = useCallback(async () => {
        try {
            const list = await getUnlockedAchievements();
            setUnlocked(list);
        } catch (e) {
            console.error("Failed to load achievements", e);
        }
    }, []);

    useEffect(() => {
        refreshAchievements();
    }, [refreshAchievements]);

    const reportResult = useCallback(async (isCorrect: boolean) => {
        if (isCorrect) {
            globalSessionStreak++;
            try {
                const newlyUnlockedTitle = await checkStreakAchievement(globalSessionStreak);
                if (newlyUnlockedTitle) {
                    Alert.alert("Osiągnięcie odblokowane!", newlyUnlockedTitle);
                    refreshAchievements();
                }
            } catch (e) {
                console.error("Failed to check streak achievement", e);
            }
        } else {
            globalSessionStreak = 0;
        }
    }, [refreshAchievements]);

    const getAchievementDetails = useCallback((id: string) => {
        return ACHIEVEMENTS.find(a => a.id === id);
    }, []);

    return {
        unlocked,
        reportResult,
        refreshAchievements,
        getAchievementDetails
    };
}
