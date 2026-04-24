import AccessibilitySection from "@/src/components/settings/AccessibilitySection";
import AppearanceSection from "@/src/components/settings/AppearanceSection";
import CoursesDataSection from "@/src/components/settings/CoursesDataSection";
import DebuggingSection from "@/src/components/settings/DebuggingSection";
import LearningSection from "@/src/components/settings/LearningSection";
import React, { useEffect, useState } from "react";
import { Animated, LayoutChangeEvent, ScrollView, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { useStyles } from "./SettingsScreen-styles";

const BASE_TAB_CONFIG = [
  {
    key: "ui",
    labelKey: "settings.tabs.ui",
    icon: "color-palette-outline" as const,
  },
  {
    key: "accessibility",
    labelKey: "settings.tabs.accessibility",
    icon: "accessibility" as const,
  },
  { key: "learning", labelKey: "settings.tabs.learning", icon: "school" as const },
  { key: "coursesData", labelKey: "settings.tabs.coursesData", icon: "albums" as const },
] as const;

const DEBUG_TAB_CONFIG = [
  { key: "debug", labelKey: "settings.tabs.debug", icon: "bug-outline" as const },
] as const;

type BaseTabKey = (typeof BASE_TAB_CONFIG)[number]["key"];
type TabKey = BaseTabKey | "debug";

const TAB_CONFIG: readonly {
  key: TabKey;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = __DEV__ ? [...BASE_TAB_CONFIG, ...DEBUG_TAB_CONFIG] : BASE_TAB_CONFIG;

export default function SettingsScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>(TAB_CONFIG[0].key);
  const [tabBarWidth, setTabBarWidth] = useState(0);
  const tabThumbX = useState(() => new Animated.Value(0))[0];
  const tabThumbWidth = Math.max(0, tabBarWidth / TAB_CONFIG.length);

  const handleTabBarLayout = (event: LayoutChangeEvent) => {
    setTabBarWidth(event.nativeEvent.layout.width);
  };

  useEffect(() => {
    if (tabThumbWidth <= 0) return;
    const activeIndex = TAB_CONFIG.findIndex((tab) => tab.key === activeTab);
    Animated.timing(tabThumbX, {
      toValue: activeIndex * tabThumbWidth,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [activeTab, tabThumbWidth, tabThumbX]);

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === "ui" && <AppearanceSection />}
          {activeTab === "learning" && <LearningSection />}
          {activeTab === "accessibility" && <AccessibilitySection />}
          {activeTab === "coursesData" && <CoursesDataSection />}
          {activeTab === "debug" && __DEV__ && <DebuggingSection />}
        </ScrollView>
      </View>

      <View style={styles.tabBar}>
        <View style={styles.tabBarInner} onLayout={handleTabBarLayout}>
          {tabThumbWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.tabBarThumb,
                {
                  width: tabThumbWidth,
                  transform: [{ translateX: tabThumbX }],
                },
              ]}
            />
          ) : null}

          {TAB_CONFIG.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.8}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tabButton,
                  isActive && styles.tabButtonActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t(tab.labelKey)}
              >
                <View style={styles.tabButtonInner}>
                  <Ionicons
                    name={tab.icon}
                    size={22}
                    style={[
                      styles.tabIcon,
                      isActive && styles.tabIconActive,
                    ]}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}
