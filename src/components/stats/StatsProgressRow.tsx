import React from "react";
import StatsDataBar from "./StatsDataBar";
import { Text, View, type ViewProps } from "react-native";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import {
  statsIconBackgrounds,
  statsMetricStyles,
  statsProgressStyles,
  statsTypography,
} from "@/src/screens/stats/StatsScreen/statsDesign";

type FrameProps = Pick<ViewProps, "testID" | "onLayout" | "children"> & {
  icon: React.ReactNode;
  track: React.ReactNode;
  isLast?: boolean;
};

type Props = Omit<FrameProps, "children" | "track"> & {
  title?: string;
  label: string;
  value: string;
  progress: number;
  progressColor: string;
  progressLabel: string;
  trackTestID?: string;
  fillTestID?: string;
  fillAccessibilityLabel?: string;
};

const useStyles = createThemeStylesHook((colors) => ({
  row: { ...statsProgressStyles.row, borderBottomColor: colors.border },
  lastRow: { ...statsProgressStyles.lastRow },
  header: { ...statsMetricStyles.contentRow },
  copy: { ...statsMetricStyles.copy },
  title: { ...statsTypography.cardTitle, color: colors.headline },
  metaRow: { ...statsProgressStyles.metaRow },
  label: { ...statsTypography.metricLabel, color: colors.paragraph, flexShrink: 1 },
  labelWithoutTitle: { flex: 1, minWidth: 0 },
  value: { ...statsTypography.metricLabel, fontWeight: "700", fontVariant: ["tabular-nums"], color: colors.headline },
  skeletonIcon: { ...statsMetricStyles.iconContainer, backgroundColor: colors.border },
  skeletonTitle: {
    width: "58%", height: 20, borderRadius: 999,
    backgroundColor: colors.border, opacity: 0.18,
  },
  skeletonLabel: {
    width: 52, height: 18, borderRadius: 999,
    backgroundColor: colors.border, opacity: 0.16,
  },
  skeletonValue: {
    width: 26, height: 18, borderRadius: 999,
    backgroundColor: colors.border, opacity: 0.16,
  },
  skeletonTrack: {
    ...statsMetricStyles.progressTrack, backgroundColor: colors.border, opacity: 0.14,
  },
}));

function RowFrame({ icon, track, isLast, children, ...props }: FrameProps) {
  const styles = useStyles();
  return (
    <View {...props} style={[styles.row, isLast && styles.lastRow]}>
      <View style={styles.header}>
        {icon}
        <View style={styles.copy}>{children}</View>
      </View>
      {track}
    </View>
  );
}

export default function StatsProgressRow({
  title, label, value, progress, progressColor, progressLabel,
  trackTestID, fillTestID, fillAccessibilityLabel, ...frameProps
}: Props) {
  const styles = useStyles();

  return (
    <RowFrame
      {...frameProps}
      track={(
        <StatsDataBar
          progress={progress}
          color={progressColor}
          label={progressLabel}
          testID={trackTestID}
          fillTestID={fillTestID}
          fillAccessibilityLabel={fillAccessibilityLabel}
        />
      )}
    >
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.metaRow}>
        <Text style={[styles.label, !title && styles.labelWithoutTitle]}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </RowFrame>
  );
}

export function StatsProgressRowSkeleton({ index, isLast }: { index: number; isLast: boolean }) {
  const styles = useStyles();
  return (
    <RowFrame
      isLast={isLast}
      icon={<View style={[styles.skeletonIcon, { backgroundColor: statsIconBackgrounds[index % statsIconBackgrounds.length] }]} />}
      track={<View style={styles.skeletonTrack} />}
    >
      <View style={styles.skeletonTitle} />
      <View style={styles.metaRow}>
        <View style={styles.skeletonLabel} />
        <View style={styles.skeletonValue} />
      </View>
    </RowFrame>
  );
}
