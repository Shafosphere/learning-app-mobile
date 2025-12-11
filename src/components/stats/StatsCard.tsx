import React from "react";
import { View, Text, ViewProps } from "react-native";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

type Props = ViewProps & {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
};

const useStyles = createThemeStylesHook((colors) => ({
  container: {
    backgroundColor: colors.secondBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.headline,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.paragraph,
    opacity: 0.7,
  },
  content: {
    marginTop: 12,
  },
}));

const StatsCard: React.FC<Props> = ({
  title,
  subtitle,
  action,
  children,
  style,
  ...rest
}) => {
  const styles = useStyles();

  return (
    <View style={[styles.container, style]} {...rest}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {action}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

export default StatsCard;
