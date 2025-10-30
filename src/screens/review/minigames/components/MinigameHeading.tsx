import React from "react";
import { Text, View } from "react-native";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";

import { useStyles } from "./MinigameHeading-styles";

type MinigameHeadingProps = {
  title: string;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
};

export function MinigameHeading({
  title,
  containerStyle,
  textStyle,
  testID,
}: MinigameHeadingProps) {
  const styles = useStyles();

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.text, textStyle]} testID={testID}>
        {title}
      </Text>
    </View>
  );
}

export default MinigameHeading;
