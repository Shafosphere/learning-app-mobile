import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

type ChevronStripeProps = {
  count?: number;
  style?: StyleProp<ViewStyle>;
};

const useStyles = createThemeStylesHook((colors) => ({
  strip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 30,
  },
  chevron: {
    width: 30,
    height: 30,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderColor: colors.border,
    transform: [{ rotate: "-45deg" }],
  },
  chevronGap: {
    marginRight: 2,
  },
}));

export function ChevronStripe({ count = 14, style }: ChevronStripeProps) {
  const styles = useStyles();

  return (
    <View style={[styles.strip, style]}>
      {Array.from({ length: count }).map((_, idx) => (
        <View
          key={idx}
          style={[styles.chevron, idx !== count - 1 && styles.chevronGap]}
        />
      ))}
    </View>
  );
}
