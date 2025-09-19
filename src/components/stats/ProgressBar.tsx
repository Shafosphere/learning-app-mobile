import React from "react";
import { View, Text } from "react-native";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { useSettings } from "@/src/contexts/SettingsContext";

type Props = {
  value: number; // 0..1
  label?: string;
  showPercent?: boolean;
  color?: string;
};

const clamp01 = (v: number) => {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
};

const useStyles = createThemeStylesHook((colors) => ({
  container: {
    gap: 6,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.paragraph,
  },
  valueText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.paragraph,
    opacity: 0.8,
  },
  track: {
    height: 10,
    borderRadius: 100,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 100,
  },
}));

const ProgressBar: React.FC<Props> = ({
  value,
  label,
  showPercent = true,
  color,
}) => {
  const styles = useStyles();
  const { colors } = useSettings();
  const pct = clamp01(value) * 100;
  return (
    <View style={styles.container}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {showPercent ? (
            <Text style={styles.valueText}>{`${Math.round(pct)}%`}</Text>
          ) : null}
        </View>
      ) : null}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%`, backgroundColor: color ?? colors.my_green },
          ]}
        />
      </View>
    </View>
  );
};

export default ProgressBar;
