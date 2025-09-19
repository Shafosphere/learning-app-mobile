import React from "react";
import { View, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import StatsCard from "./StatsCard";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import type { AchievementDefinition } from "@/src/constants/achievements";
import { useSettings } from "@/src/contexts/SettingsContext";

export type AchievementListItem = AchievementDefinition & {
  unlocked: boolean;
  unlockedAt?: string;
};

const useStyles = createThemeStylesHook((colors) => ({
  item: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  last: {
    borderBottomWidth: 0,
  },
  textWrap: {
    flexShrink: 1,
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.headline,
  },
  description: {
    marginTop: 2,
    fontSize: 13,
    color: colors.paragraph,
    opacity: 0.8,
  },
  status: {
    marginTop: 4,
    fontSize: 12,
    color: colors.paragraph,
    opacity: 0.7,
  },
}));

function formatDateLabel(iso?: string) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  const formatted = date.toLocaleDateString?.();
  return formatted ?? iso.slice(0, 10);
}

const AchievementsList: React.FC<{ items: AchievementListItem[] }> = ({
  items,
}) => {
  const styles = useStyles();
  const { colors } = useSettings();

  return (
    <StatsCard
      title="Odznaki"
      subtitle={
        items.some((item) => item.unlocked)
          ? "Brawo! Oto Twoje osiągnięcia."
          : "Odblokuj nowe odznaki utrzymując dobrą passę."
      }
    >
      {items.map((item, idx) => {
        const iconName = item.unlocked ? "ribbon" : "lock-closed";
        const iconColor = item.unlocked ? colors.my_yellow : colors.paragraph;
        const unlockedLabel = item.unlocked
          ? `Odblokowano: ${formatDateLabel(item.unlockedAt) ?? "dziś"}`
          : "Jeszcze nie odblokowano";
        return (
          <View
            key={item.id}
            style={[styles.item, idx === items.length - 1 && styles.last]}
          >
            <Ionicons
              name={iconName}
              size={20}
              color={iconColor}
              style={{ marginTop: 4 }}
            />
            <View style={styles.textWrap}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
              <Text style={styles.status}>{unlockedLabel}</Text>
            </View>
          </View>
        );
      })}
    </StatsCard>
  );
};

export default AchievementsList;
