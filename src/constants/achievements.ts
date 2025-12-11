export type AchievementType = "streak" | "course_completion" | "total_words" | "speed";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  type: AchievementType;
  targetValue: number; // e.g., 20 for streak
  icon: string; // resource name or identifier
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "streak_5",
    title: "Rozgrzewka",
    description: "Odpowiedz poprawnie 5 razy z rzędu",
    type: "streak",
    targetValue: 5,
    icon: "reward1",
  },
  {
    id: "streak_20",
    title: "Na fali",
    description: "Odpowiedz poprawnie 20 razy z rzędu",
    type: "streak",
    targetValue: 20,
    icon: "reward1",
  },
  {
    id: "streak_50",
    title: "Mistrz koncentracji",
    description: "Odpowiedz poprawnie 50 razy z rzędu",
    type: "streak",
    targetValue: 50,
    icon: "reward1",
  },
];
