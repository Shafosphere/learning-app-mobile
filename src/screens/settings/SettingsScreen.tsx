import AccessibilitySection from "@/src/components/settings/AccessibilitySection";
import AppearanceSection from "@/src/components/settings/AppearanceSection";
import CoursesDataSection from "@/src/components/settings/CoursesDataSection";
import DebuggingSection from "@/src/components/settings/DebuggingSection";
import LearningSection from "@/src/components/settings/LearningSection";
import React, { useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { useTranslation } from "react-i18next";
import { useStyles } from "./SettingsScreen-styles";

const BASE_TAB_CONFIG = [
  {
    key: "ui",
    labelKey: "settings.tabs.ui",
    icon: "color-palette-outline" as const,
    faIcon: "palette" as const,
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
  faIcon?: React.ComponentProps<typeof FontAwesome5>["name"];
}[] = __DEV__ ? [...BASE_TAB_CONFIG, ...DEBUG_TAB_CONFIG] : BASE_TAB_CONFIG;

export default function SettingsScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>(TAB_CONFIG[0].key);

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
        {TAB_CONFIG.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.7}
            onPress={() => setActiveTab(tab.key)}
            style={[
              styles.tabButton,
              activeTab === tab.key && styles.tabButtonActive,
            ]}
          >
            {tab.faIcon ? (
              <FontAwesome5
                name={tab.faIcon}
                size={24}
                style={[
                  styles.tabIcon,
                  activeTab === tab.key && styles.tabIconActive,
                ]}
                accessibilityLabel={t(tab.labelKey)}
              />
            ) : (
              <Ionicons
                name={tab.icon}
                size={24}
                style={[
                  styles.tabIcon,
                  activeTab === tab.key && styles.tabIconActive,
                ]}
                accessibilityLabel={t(tab.labelKey)}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
