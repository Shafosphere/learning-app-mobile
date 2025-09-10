import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function Review() {
  return (
    <View style={styles.container}>
      <Text>tu beda powtórki</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
});

