import React from "react";
import { Text, View } from "react-native";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { statsTypography } from "@/src/screens/stats/StatsScreen/statsDesign";

type Props = {
  title: string;
  subtitle?: string;
  metadata?: string;
  /** Reserve the wider scope label so switching pages cannot reflow the row. */
  metadataWidthReference?: string;
};

const useStyles = createThemeStylesHook((colors) => ({
  header: {
    gap: 4,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    columnGap: 12,
    rowGap: 4,
  },
  title: {
    ...statsTypography.sectionTitle,
    color: colors.headline,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 180,
    minWidth: 0,
  },
  metadataSlot: {
    flexShrink: 1,
    maxWidth: "100%",
    marginLeft: "auto",
  },
  metadata: {
    ...statsTypography.description,
    color: colors.paragraph,
    textAlign: "right",
  },
  metadataReference: {
    opacity: 0,
  },
  metadataOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  subtitle: {
    ...statsTypography.description,
    color: colors.paragraph,
  },
}));

export default function StatsSectionHeader({ title, subtitle, metadata, metadataWidthReference }: Props) {
  const styles = useStyles();

  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        {metadata ? (
          <View style={styles.metadataSlot}>
            {metadataWidthReference ? (
              <Text
                style={[styles.metadata, styles.metadataReference]}
                numberOfLines={1}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {metadataWidthReference}
              </Text>
            ) : null}
            <Text
              style={[styles.metadata, metadataWidthReference ? styles.metadataOverlay : null]}
              numberOfLines={metadataWidthReference ? 1 : undefined}
            >
              {metadata}
            </Text>
          </View>
        ) : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}
