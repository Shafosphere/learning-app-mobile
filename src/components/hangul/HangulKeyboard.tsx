import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";

const ROWS_NORMAL = [
  ["ㅂ", "ㅈ", "ㄷ", "ㄱ", "ㅅ", "ㅛ", "ㅕ", "ㅑ", "ㅐ", "ㅔ"],
  ["ㅁ", "ㄴ", "ㅇ", "ㄹ", "ㅎ", "ㅗ", "ㅓ", "ㅏ", "ㅣ"],
  ["ㅋ", "ㅌ", "ㅊ", "ㅍ", "ㅠ", "ㅜ", "ㅡ"],
] as const;

const ROWS_SHIFTED = [
  ["ㅃ", "ㅉ", "ㄸ", "ㄲ", "ㅆ", "ㅛ", "ㅕ", "ㅑ", "ㅒ", "ㅖ"],
  ["ㅁ", "ㄴ", "ㅇ", "ㄹ", "ㅎ", "ㅗ", "ㅓ", "ㅏ", "ㅣ"],
  ["ㅋ", "ㅌ", "ㅊ", "ㅍ", "ㅠ", "ㅜ", "ㅡ"],
] as const;

const useStyles = createThemeStylesHook((colors) => ({
  container: {
    width: "100%",
    paddingTop: 6,
    backgroundColor: "#D1D5DB",
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    marginBottom: 6,
    paddingHorizontal: 6,
  },
  keyButton: {
    flex: 1,
    height: 42,
    marginHorizontal: 3,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 1,
  },
  functionKey: {
    backgroundColor: "#ACB4BC",
    flexGrow: 1.5,
  },
  keyPressed: {
    backgroundColor: "#E5E7EB",
    transform: [{ scale: 0.95 }],
  },
  shiftActive: {
    backgroundColor: "#FFFFFF",
  },
  keyLabel: {
    fontSize: 20,
    color: "#000000",
    fontWeight: "400",
  },
  bottomRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginTop: 2,
    alignItems: "center",
    marginBottom: 40,
  },
  spaceBar: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    height: 42,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 3,
  },
  confirmButton: {
    width: 60,
    height: 42,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 3,
    backgroundColor: "#007AFF",
  },
}));

export type HangulKeyboardProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  onBackspace?: () => void;
  bottomPadding?: number;
};

export default function HangulKeyboard({
  value,
  onChangeText,
  onSubmit,
  onBackspace,
  bottomPadding = 0,
}: HangulKeyboardProps) {
  const styles = useStyles();
  const [isShifted, setIsShifted] = useState(false);

  const currentRows = isShifted ? ROWS_SHIFTED : ROWS_NORMAL;

  const handleAppend = (symbol: string) => {
    onChangeText(`${value ?? ""}${symbol}`);
    if (isShifted) setIsShifted(false);
  };

  const handleBackspace = () => {
    if (!value) {
      onBackspace?.();
      return;
    }
    onChangeText(value.slice(0, -1));
    onBackspace?.();
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      {currentRows.slice(0, 2).map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((symbol) => (
            <Pressable
              key={symbol}
              style={({ pressed }) => [
                styles.keyButton,
                pressed && styles.keyPressed,
              ]}
              onPress={() => handleAppend(symbol)}
            >
              <Text style={styles.keyLabel}>{symbol}</Text>
            </Pressable>
          ))}
        </View>
      ))}

      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [
            styles.keyButton,
            styles.functionKey,
            isShifted && styles.shiftActive,
            pressed && styles.keyPressed,
          ]}
          onPress={() => setIsShifted(!isShifted)}
        >
          <Text style={styles.keyLabel}>⇧</Text>
        </Pressable>

        {currentRows[2].map((symbol) => (
          <Pressable
            key={symbol}
            style={({ pressed }) => [
              styles.keyButton,
              pressed && styles.keyPressed,
            ]}
            onPress={() => handleAppend(symbol)}
          >
            <Text style={styles.keyLabel}>{symbol}</Text>
          </Pressable>
        ))}

        <Pressable
          style={({ pressed }) => [
            styles.keyButton,
            styles.functionKey,
            pressed && styles.keyPressed,
          ]}
          onPress={handleBackspace}
        >
          <Text style={styles.keyLabel}>⌫</Text>
        </Pressable>
      </View>

      <View style={styles.bottomRow}>
        <Pressable
          style={({ pressed }) => [
            styles.spaceBar,
            pressed && styles.keyPressed,
          ]}
          onPress={() => handleAppend(" ")}
        >
          <Text style={{ fontSize: 14, color: "#555" }}></Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.confirmButton,
            pressed && styles.keyPressed,
          ]}
          onPress={onSubmit}
        >
          <Text style={[styles.keyLabel, { color: "#FFF", fontSize: 20 }]}>
            ✓
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
