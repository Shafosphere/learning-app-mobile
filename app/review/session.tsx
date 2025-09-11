import React from "react";
import { Text, View } from "react-native";
import { useStyles } from "@/src/screens/level/styles_level";

export default function ReviewSession() {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <Text style={{ color: styles.level.color, fontSize: 24 }}>
        TODO: review session
      </Text>
    </View>
  );
}

