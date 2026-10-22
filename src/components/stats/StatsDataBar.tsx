import React from "react";
import { View } from "react-native";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { statsMetricStyles } from "@/src/screens/stats/StatsScreen/statsDesign";

type Props = {
  progress: number;
  color: string;
  label: string;
  testID?: string;
  fillTestID?: string;
  fillAccessibilityLabel?: string;
};

const useStyles = createThemeStylesHook((colors) => ({
  track: { ...statsMetricStyles.progressTrack, backgroundColor: colors.background },
  fill: { height: "100%", borderRadius: 999 },
}));

export default function StatsDataBar({ progress, color, label, testID, fillTestID, fillAccessibilityLabel }: Props) {
  const styles = useStyles();
  const value = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;

  return (
    <View
      testID={testID}
      style={styles.track}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
    >
      {value > 0 ? (
        <View
          testID={fillTestID}
          accessibilityLabel={fillAccessibilityLabel}
          style={[styles.fill, { width: `${value * 100}%`, backgroundColor: color }]}
        />
      ) : null}
    </View>
  );
}
