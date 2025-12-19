export type AchievementType = "streak" | "course_completion" | "total_words" | "speed";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  type: AchievementType;
  targetValue: number; // e.g., 20 for streak
  icon: string; // resource name or identifier
}

// Achievements are temporarily disabled; keep the shape but expose an empty list.
export const ACHIEVEMENTS: AchievementDef[] = [];
