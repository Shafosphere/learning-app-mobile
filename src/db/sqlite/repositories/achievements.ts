import { ACHIEVEMENTS } from "@/src/constants/achievements";
import { getDB } from "../core";

export interface UserAchievement {
    id: string;
    unlockedAt: number;
}

export async function getUnlockedAchievements(): Promise<UserAchievement[]> {
    const db = await getDB();
    const result = await db.getAllAsync<{ id: string; unlocked_at: number }>(
        "SELECT id, unlocked_at FROM user_achievements"
    );
    return result.map((r) => ({ id: r.id, unlockedAt: r.unlocked_at }));
}

export async function unlockAchievement(id: string): Promise<boolean> {
    const db = await getDB();
    const existing = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM user_achievements WHERE id = ?",
        id
    );

    if (existing) {
        return false;
    }

    await db.runAsync(
        "INSERT INTO user_achievements (id, unlocked_at) VALUES (?, ?)",
        id,
        Date.now()
    );
    return true;
}

export async function checkStreakAchievement(currentStreak: number): Promise<string | null> {
    const streakAchievements = ACHIEVEMENTS.filter((a) => a.type === "streak");

    // Find achievement with exactly this target value
    const target = streakAchievements.find((a) => a.targetValue === currentStreak);

    if (target) {
        const isNew = await unlockAchievement(target.id);
        if (isNew) return target.title;
    }
    return null;
}
