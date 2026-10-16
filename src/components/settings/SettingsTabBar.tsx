import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Animated, TouchableOpacity, View } from "react-native";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import { useStyles } from "./SettingsTabBar-styles";
import { useSettingsPagerAccessibility } from "./useSettingsPagerAccessibility";

export type SettingsTabOption<T extends string> = {
  key: T;
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
};

type Props<T extends string> = {
  options: readonly SettingsTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SettingsTabBar<T extends string>({
  options,
  value,
  onChange,
}: Props<T>) {
  const styles = useStyles();
  const { reduceMotion } = useSettingsPagerAccessibility();
  const { isTabletLayout } = useDeviceLayout();
  const [width, setWidth] = useState(0);
  const thumbX = useRef(new Animated.Value(0)).current;
  const index = options.findIndex((option) => option.key === value);
  const tabWidth = options.length > 0 ? width / options.length : 0;

  useEffect(() => {
    if (tabWidth <= 0 || index < 0) return;
    if (reduceMotion) {
      thumbX.setValue(index * tabWidth);
      return;
    }
    const animation = Animated.timing(thumbX, {
      toValue: index * tabWidth,
      duration: 220,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [index, tabWidth, thumbX, reduceMotion]);

  if (options.length === 0) return null;

  return (
    <View style={styles.bar}>
      <View
        style={[styles.inner, isTabletLayout && styles.innerTablet]}
        onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
        testID="settings-tab-bar"
      >
        {tabWidth > 0 && index >= 0 ? (
          <Animated.View
            pointerEvents="none"
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            testID="settings-tab-indicator"
            style={[
              styles.thumb,
              { width: tabWidth, transform: [{ translateX: thumbX }] },
            ]}
          />
        ) : null}
        {options.map((option) => {
          const selected = option.key === value;
          return (
            <TouchableOpacity
              key={option.key}
              activeOpacity={0.8}
              onPress={() => {
                if (!selected) onChange(option.key);
              }}
              style={styles.button}
              accessibilityRole="tab"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
            >
              <View style={styles.buttonInner}>
                <Ionicons
                  name={option.icon}
                  size={22}
                  style={[styles.icon, selected && styles.iconActive]}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
