export type AchievementType = "streak" | "dailyGoal";

export type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  threshold: number;
  type: AchievementType;
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "streak_spark",
    title: "Pierwsza iskra",
    description: "Utrzymaj passę przez 3 kolejne dni.",
    threshold: 3,
    type: "streak",
  },
  {
    id: "streak_blaze",
    title: "Płomień nauki",
    description: "Dotrzymaj do 7 dni codziennej nauki.",
    threshold: 7,
    type: "streak",
  },
  {
    id: "streak_unstoppable",
    title: "Nie do zatrzymania",
    description: "Zbuduj 30-dniową passę.",
    threshold: 30,
    type: "streak",
  },
  {
    id: "daily_goal_champion",
    title: "Mistrz celu",
    description: "Zrealizuj swój dzienny cel nauki.",
    threshold: 1,
    type: "dailyGoal",
  },
];
