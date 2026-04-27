import React from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

type Props = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  iconBackgroundColor?: string;
  iconShadowColor?: string;
  style?: StyleProp<ViewStyle>;
};

const useStyles = createThemeStylesHook((colors) => ({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.headline,
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 3,
    color: colors.paragraph,
    fontSize: 14,
    lineHeight: 18,
    minHeight: 36,
    opacity: 0.78,
  },
}));

export default function StatsSectionHeader({
  icon,
  title,
  subtitle,
  iconBackgroundColor = "#EDE7FF",
  iconShadowColor = "#6D4EDB",
  style,
}: Props) {
  const styles = useStyles();

  return (
    <View style={[styles.header, style]}>
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: iconBackgroundColor,
            shadowColor: iconShadowColor,
          },
        ]}
      >
        {icon}
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
