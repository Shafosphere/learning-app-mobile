import React, { ComponentProps } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FOOTER_BASE_PADDING, useStyles } from "./MinigameLayout-styles";
import MyButton from "@/src/components/button/button";

type FooterActionConfig = {
  key?: string;
  text: string;
  onPress: () => void;
  disabled?: boolean;
  color?: ComponentProps<typeof MyButton>["color"];
  width?: number;
  accessibilityLabel?: string;
};

type MinigameLayoutProps = {
  children: React.ReactNode;
  footerContent?: React.ReactNode;
  footerActions?: FooterActionConfig[];
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  footerContainerStyle?: StyleProp<ViewStyle>;
  footerRowStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

export function MinigameLayout({
  children,
  footerContent,
  footerActions,
  style,
  contentStyle,
  footerContainerStyle,
  footerRowStyle,
  testID,
}: MinigameLayoutProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  const resolvedFooterContent =
    footerContent ??
    (footerActions && footerActions.length > 0
      ? footerActions.map((action, index) => (
          <MyButton
            key={action.key ?? `${action.text}-${index}`}
            text={action.text}
            onPress={action.onPress}
            disabled={action.disabled}
            color={action.color}
            width={action.width}
            accessibilityLabel={action.accessibilityLabel}
          />
        ))
      : null);

  return (
    <View style={[styles.root, style]} testID={testID}>
      <View style={[styles.content, contentStyle]}>{children}</View>
      {resolvedFooterContent ? (
        <View
          style={[
            styles.footerContainer,
            { paddingBottom: FOOTER_BASE_PADDING + Math.max(insets.bottom, 0) },
            footerContainerStyle,
          ]}
        >
          <View style={[styles.footerRow, footerRowStyle]}>
            {resolvedFooterContent}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default MinigameLayout;
