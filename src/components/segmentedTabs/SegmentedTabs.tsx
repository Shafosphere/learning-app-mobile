import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";

type SegmentedTabsOption<T extends string> = {
  key: T;
  label: string;
};

type SegmentedTabsProps<T extends string> = {
  options: SegmentedTabsOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  containerStyle?: StyleProp<ViewStyle>;
};

const PAD = 4;

const useStyles = createThemeStylesHook((colors) => ({
  tabs: {
    width: "100%",
    flexDirection: "row" as const,
    alignItems: "center" as const,
    position: "relative" as const,
    padding: PAD,
    borderRadius: 16,
    backgroundColor: colors.background,
    overflow: "hidden" as const,
  },
  thumb: {
    position: "absolute" as const,
    top: PAD,
    bottom: PAD,
    borderRadius: 6,
    backgroundColor: colors.secondBackground,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    zIndex: 2,
  },
  tabContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: "rgba(15, 23, 42, 0.18)",
  },
  dotActive: {
    backgroundColor: colors.my_green,
    shadowColor: colors.my_green,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 1,
  },
  tabText: {
    color: colors.paragraph,
    fontSize: 14,
    fontWeight: "800" as const,
    textAlign: "center" as const,
  },
  tabTextActive: {
    color: colors.headline,
  },
}));

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  containerStyle,
}: SegmentedTabsProps<T>) {
  const styles = useStyles();
  const [tabsWidth, setTabsWidth] = useState(0);
  const sliderX = useState(() => new Animated.Value(0))[0];

  const activeIndex = useMemo(
    () => Math.max(0, options.findIndex((option) => option.key === value)),
    [options, value]
  );
  const tabWidth =
    options.length > 0 ? Math.max(0, (tabsWidth - PAD * 2) / options.length) : 0;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setTabsWidth(event.nativeEvent.layout.width);
  }, []);

  useEffect(() => {
    if (tabWidth <= 0) {
      return;
    }
    Animated.timing(sliderX, {
      toValue: activeIndex * tabWidth,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, sliderX, tabWidth]);

  return (
    <View
      style={[styles.tabs, containerStyle]}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      onLayout={handleLayout}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            width: tabWidth,
            left: PAD,
            transform: [{ translateX: sliderX }],
          },
        ]}
      />
      {options.map((option) => {
        const isActive = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={styles.tab}
            onPress={() => onChange(option.key)}
          >
            <View style={styles.tabContent}>
              <View style={[styles.dot, isActive && styles.dotActive]} />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {option.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
