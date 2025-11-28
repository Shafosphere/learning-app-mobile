import React, { useMemo, useState } from "react";
import { View, Text } from "react-native";
import Svg, { Polygon } from "react-native-svg";
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
    gap: 8,
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
  trackWrapper: {
    height: 15,
    marginHorizontal: 4,
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
  const [barWidth, setBarWidth] = useState<number | null>(null);

  const pointsForWidth = useMemo(() => {
    if (!barWidth) return null;
    const height = styles.trackWrapper.height as number;
    const slant = Math.min(10, barWidth / 5);
    const buildPoints = (width: number) => {
      const safeWidth = Math.max(width, slant * 2);
      return `${slant},0 ${safeWidth},0 ${safeWidth - slant},${height} 0,${height}`;
    };
    const trackPoints = buildPoints(barWidth);
    const fillWidth = Math.min(barWidth, Math.max(0, (barWidth * pct) / 100));
    const fillPoints = fillWidth > 0 ? buildPoints(fillWidth) : null;
    return { trackPoints, fillPoints };
  }, [barWidth, pct, styles.trackWrapper.height]);

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
      <View
        style={styles.trackWrapper}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {pointsForWidth ? (
          <Svg
            width={barWidth ?? 0}
            height={styles.trackWrapper.height as number}
            viewBox={`0 0 ${barWidth ?? 0} ${styles.trackWrapper.height as number}`}
          >
            <Polygon points={pointsForWidth.trackPoints} fill={colors.my_red} />
            {pointsForWidth.fillPoints ? (
              <Polygon
                points={pointsForWidth.fillPoints}
                fill={color ?? colors.my_green}
              />
            ) : null}
          </Svg>
        ) : null}
      </View>
    </View>
  );
};

export default ProgressBar;
