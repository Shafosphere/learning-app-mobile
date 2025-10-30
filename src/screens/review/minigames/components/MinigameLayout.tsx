import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FOOTER_BASE_PADDING, useStyles } from "./MinigameLayout-styles";

type MinigameLayoutProps = {
  children: React.ReactNode;
  footerContent?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  footerContainerStyle?: StyleProp<ViewStyle>;
  footerRowStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

export function MinigameLayout({
  children,
  footerContent,
  style,
  contentStyle,
  footerContainerStyle,
  footerRowStyle,
  testID,
}: MinigameLayoutProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, style]} testID={testID}>
      <View style={[styles.content, contentStyle]}>{children}</View>
      {footerContent ? (
        <View
          style={[
            styles.footerContainer,
            { paddingBottom: FOOTER_BASE_PADDING + Math.max(insets.bottom, 0) },
            footerContainerStyle,
          ]}
        >
          <View style={[styles.footerRow, footerRowStyle]}>
            {footerContent}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default MinigameLayout;
