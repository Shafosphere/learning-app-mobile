import React from "react";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Text, View } from "react-native";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { statsTypography } from "@/src/screens/stats/StatsScreen/statsDesign";

type Props = {
  title: string;
  subtitle?: string;
  metadata?: string;
  /** Reserve the wider scope label so switching pages cannot reflow the row. */
  metadataWidthReference?: string;
  level?: "section" | "card";
  icon?: React.ComponentProps<typeof FontAwesome6>["name"];
};

const useStyles = createThemeStylesHook((colors) => ({
  header: {
    gap: 4,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "flex-end",
    columnGap: 12,
    rowGap: 4,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  sectionLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    marginTop: -2,
    borderBottomWidth: 4,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  sectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "100%",
    minWidth: 0,
    gap: 6,
    paddingLeft: 12,
    backgroundColor: colors.background,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.headline,
    flexShrink: 1,
    minWidth: 0,
    // Leave room for Android's fractional glyph measurements.
    paddingRight: 2,
  },
  title: {
    ...statsTypography.cardTitle,
    color: colors.headline,
    flexShrink: 1,
    minWidth: 0,
  },
  metadataSlot: {
    flexShrink: 1,
    maxWidth: "100%",
  },
  sectionMetadata: { alignSelf: "flex-end" },
  cardMetadata: { flexShrink: 0, maxWidth: "45%" },
  cardMetadataText: { textAlign: "left" },
  metadata: {
    fontSize: 13,
    lineHeight: 18,
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
    fontSize: 13,
    lineHeight: 18,
    color: colors.paragraph,
    alignSelf: "flex-end",
    textAlign: "right",
    maxWidth: "100%",
  },
  supportingRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  supportingSubtitle: {
    flex: 1,
    minWidth: 0,
    alignSelf: "auto",
  },
}));

export default function StatsSectionHeader({ title, subtitle, metadata, metadataWidthReference, level = "section", icon }: Props) {
  const styles = useStyles();
  const isSection = level === "section";
  const metadataContent = metadata ? (
    <View style={[styles.metadataSlot, isSection ? styles.sectionMetadata : styles.cardMetadata]}>
      {metadataWidthReference ? (
        <Text
          style={[styles.metadata, !isSection && styles.cardMetadataText, styles.metadataReference]}
          numberOfLines={1}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {metadataWidthReference}
        </Text>
      ) : null}
      <Text
        style={[styles.metadata, !isSection && styles.cardMetadataText, metadataWidthReference ? styles.metadataOverlay : null]}
        numberOfLines={metadataWidthReference ? 1 : undefined}
      >
        {metadata}
      </Text>
    </View>
  ) : null;

  return (
    <View style={styles.header}>
      <View style={isSection ? styles.sectionRow : styles.row}>
        {isSection ? (
          <>
            <View style={styles.sectionLine} accessible={false} />
            <View style={styles.sectionBadge}>
              {icon ? (
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <FontAwesome6 name={icon} size={16} color={styles.sectionTitle.color} />
                </View>
              ) : null}
              <Text
                accessibilityRole="header"
                accessibilityLabel={title}
                style={styles.sectionTitle}
              >
                {title.toUpperCase()}
              </Text>
            </View>
          </>
        ) : (
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        )}
      </View>
      {isSection ? metadataContent : null}
      {!isSection && metadata ? (
        <View style={styles.supportingRow}>
          {metadataContent}
          {subtitle ? <Text style={[styles.subtitle, styles.supportingSubtitle]}>{subtitle}</Text> : null}
        </View>
      ) : subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}
