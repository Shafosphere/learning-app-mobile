import Ionicons from "@expo/vector-icons/Ionicons";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { preventWidowsPl } from "@/src/utils/preventWidowsPl";

type Props = {
  title: string;
  description: string;
  children: ReactNode;
};

export function SettingsGroup({ title, description, children }: Props) {
  const [expanded, setExpanded] = useState(false);
  const styles = useStyles();
  return (
    <View style={styles.group}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={description}
        accessibilityState={{
          expanded,
        }}
        onPress={() => setExpanded((value) => !value)}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        <View style={styles.text}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{preventWidowsPl(description)}</Text>
        </View>
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={22}
            style={styles.chevron}
          />
        </View>
      </Pressable>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const useStyles = createThemeStylesHook((colors) => ({
  group: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 18,
    minHeight: 48,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  title: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "800",
    color: colors.headline,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.paragraph,
  },
  chevron: {
    color: colors.paragraph,
  },
  body: {
    paddingTop: 4,
  },
  pressed: {
    opacity: 0.8,
  },
}));
