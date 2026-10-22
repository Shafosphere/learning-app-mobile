import { statsTileStyle } from "./statsTileStyle";
import React from "react";
import { View, Text, ViewProps, type StyleProp, type ViewStyle } from "react-native";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

export type StatsCardHeaderProps = {
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  leading?: React.ReactNode;
  headerDivider?: boolean;
};

type Props = ViewProps & StatsCardHeaderProps & {
  children: React.ReactNode;
  headerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

const useStyles = createThemeStylesHook((colors) => ({
  container: {
    ...statsTileStyle,
    backgroundColor: colors.secondBackground,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    gap: 8,
  },
  titleContent: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.headline,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.paragraph,
    opacity: 0.7,
  },
  content: {
    marginTop: 12,
  },
  contentWithoutHeader: {
    marginTop: 0,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
}));

const StatsCard: React.FC<Props> = ({
  title,
  subtitle,
  action,
  leading,
  headerDivider = false,
  headerStyle,
  contentStyle,
  children,
  style,
  ...rest
}) => {
  const styles = useStyles();
  const hasHeader = Boolean(title || subtitle || action || leading);

  return (
    <View style={[styles.container, style]} {...rest}>
      {hasHeader ? (
        <View style={[headerStyle, headerDivider && styles.divider]}>
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              {leading ? <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{leading}</View> : null}
              <View style={styles.titleContent}>
                {typeof title === "string" || typeof title === "number"
                  ? <Text accessibilityRole="header" style={styles.title}>{title}</Text>
                  : title}
              </View>
            </View>
            {action}
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
      <View style={[styles.content, !hasHeader && styles.contentWithoutHeader, contentStyle]}>
        {children}
      </View>
    </View>
  );
};

export default StatsCard;
