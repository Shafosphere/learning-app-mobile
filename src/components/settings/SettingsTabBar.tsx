import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { TouchableOpacity, View } from "react-native";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import { TabSelectionIndicator, useTabIndicatorLayout } from "../navigation/TabSelectionIndicator";
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
  const indicator = useTabIndicatorLayout(options.map((option) => option.key));
  const frame = indicator.frames[value];

  if (options.length === 0) return null;

  return (
    <View style={styles.bar}>
      <View
        style={[styles.inner, isTabletLayout && styles.innerTablet]}
        onLayout={indicator.onLayout}
        testID="settings-tab-bar"
      >
        {frame && frame.width > 0 && frame.height > 0 ? (
          <TabSelectionIndicator
            frame={frame}
            layoutKey={indicator.layoutKey}
            selectionKey={value}
            reduceMotion={reduceMotion}
            testID="settings-tab-indicator"
            backgroundTestID="settings-tab-active-background"
            lineTestID="settings-tab-active-line"
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
              onLayout={(event) => indicator.onTabLayout(option.key, event)}
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
