export type AchievementType = "knownWords" | "dailyGoal";

export type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  threshold: number;
  type: AchievementType;
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "known_words_first",
    title: "Pierwsze zwycięstwo",
    description: "Opanuj pierwsze słówko w boxFive.",
    threshold: 1,
    type: "knownWords",
  },
  {
    id: "known_words_stack",
    title: "Garść słówek",
    description: "Opanuj 10 słówek.",
    threshold: 10,
    type: "knownWords",
  },
  {
    id: "known_words_master",
    title: "Słowny mistrz",
    description: "Opanuj 50 słówek.",
    threshold: 50,
    type: "knownWords",
  },
  {
    id: "daily_goal_champion",
    title: "Mistrz celu",
    description: "Zrealizuj swój dzienny cel nauki.",
    threshold: 1,
    type: "dailyGoal",
  },
];
