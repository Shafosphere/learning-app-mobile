import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput } from "react-native";
import StatsCard from "./StatsCard";
import ProgressBar from "./ProgressBar";
import MyButton from "@/src/components/button/button";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

type Props = {
  dailyGoal: number;
  currentCount: number;
  onSave: (value: number) => Promise<void> | void;
};

const useStyles = createThemeStylesHook((colors) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: colors.lightbg,
    color: colors.font,
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: colors.paragraph,
    opacity: 0.7,
  },
  feedback: {
    marginTop: 8,
    fontSize: 12,
    color: colors.my_green,
  },
  error: {
    marginTop: 8,
    fontSize: 12,
    color: colors.my_red,
  },
}));

const DailyGoalCard: React.FC<Props> = ({
  dailyGoal,
  currentCount,
  onSave,
}) => {
  const styles = useStyles();
  const [inputValue, setInputValue] = useState(String(dailyGoal || ""));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setInputValue(String(dailyGoal || ""));
  }, [dailyGoal]);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [saved]);

  const progress = useMemo(() => {
    if (!dailyGoal || dailyGoal <= 0) return 0;
    return Math.min(1, currentCount / dailyGoal);
  }, [dailyGoal, currentCount]);

  const statusLabel = useMemo(() => {
    if (!dailyGoal || dailyGoal <= 0) return "Brak ustalonego celu";
    if (currentCount >= dailyGoal) return "Cel osiągnięty!";
    const remaining = dailyGoal - currentCount;
    return `Pozostało ${remaining} poprawnych odpowiedzi`;
  }, [dailyGoal, currentCount]);

  const handleSave = async () => {
    const parsed = Number.parseInt(inputValue, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setError("Podaj liczbę większą od zera");
      return;
    }
    setError(null);
    setSaved(false);
    await onSave(parsed);
    setSaved(true);
  };

  return (
    <StatsCard
      title="Cele dzienne"
      subtitle="Ustal liczbę poprawnych odpowiedzi na dziś"
    >
      <ProgressBar value={progress} label="Dzisiejszy postęp" />
      <Text style={styles.hint}>{statusLabel}</Text>
      <View style={styles.row}>
        <TextInput
          keyboardType="number-pad"
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="np. 20"
          style={styles.input}
        />
        <MyButton text="Zapisz" onPress={handleSave} width={100} />
      </View>
      {saved && !error ? (
        <Text style={styles.feedback}>Zapisano nowy cel</Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </StatsCard>
  );
};

export default DailyGoalCard;
