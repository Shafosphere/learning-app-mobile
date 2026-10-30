import { SettingsTabBar } from "@/src/components/settings/SettingsTabBar";
import { SettingsTabPager, type SettingsTabPagerHandle } from "@/src/components/settings/SettingsTabPager";
import AccessibilitySection from "@/src/components/settings/AccessibilitySection";
import AppearanceSection from "@/src/components/settings/AppearanceSection";
import CoursesDataSection from "@/src/components/settings/CoursesDataSection";
import DebuggingSection from "@/src/components/settings/DebuggingSection";
import LearningSection from "@/src/components/settings/LearningSection";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";
import React, { useMemo, useRef, useState } from "react";
import { View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { useStyles } from "./SettingsScreen-styles";

const BASE_TAB_CONFIG = [
  {
    key: "ui",
    labelKey: "settings.tabs.ui",
    icon: "color-palette" as const,
  },
  {
    key: "accessibility",
    labelKey: "settings.tabs.accessibility",
    icon: "accessibility" as const,
  },
  {
    key: "learning",
    labelKey: "settings.tabs.learning",
    icon: "school" as const,
  },
  {
    key: "coursesData",
    labelKey: "settings.tabs.coursesData",
    icon: "albums" as const,
  },
] as const;

const DEBUG_TAB_CONFIG = [
  {
    key: "debug",
    labelKey: "settings.tabs.debug",
    icon: "bug-outline" as const,
  },
] as const;

type BaseTabKey = (typeof BASE_TAB_CONFIG)[number]["key"];
type TabKey = BaseTabKey | "debug";

const TAB_CONFIG: readonly {
  key: TabKey;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = __DEV__ ? [...BASE_TAB_CONFIG, ...DEBUG_TAB_CONFIG] : BASE_TAB_CONFIG;

function renderSettingsPage(tab: TabKey) {
  return (
            <>
              {tab === "ui" && <AppearanceSection />}
              {tab === "learning" && <LearningSection />}
              {tab === "accessibility" && <AccessibilitySection />}
              {tab === "coursesData" && <CoursesDataSection />}
              {tab === "debug" && __DEV__ && <DebuggingSection />}
            </>
  );
}

export default function SettingsScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { width, isTabletLayout, orientation } = useDeviceLayout();
  const isPhoneLandscape = !isTabletLayout && orientation === "landscape" && width >= 600;
  const isLandscapeLayout = isPhoneLandscape || (isTabletLayout && orientation === "landscape" && width >= 840);
  const useCenteredTabletLayout = isTabletLayout;
  const [activeTab, setActiveTab] = useState<TabKey>(TAB_CONFIG[0].key);
  const pagerRef = useRef<SettingsTabPagerHandle<TabKey>>(null);

  const settingsScrollProps = useMemo(() => ({
    style: [styles.content, useCenteredTabletLayout && styles.contentTablet, isLandscapeLayout && styles.contentLandscape],
    contentContainerStyle: styles.scrollContent,
    showsVerticalScrollIndicator: false,
  }), [styles.content, styles.contentTablet, styles.contentLandscape, styles.scrollContent, useCenteredTabletLayout, isLandscapeLayout]);

  return (
    <View style={[styles.container, isLandscapeLayout && styles.containerLandscape]}>
      <SettingsTabBar
        vertical={isLandscapeLayout}
        compact={isPhoneLandscape}
        options={TAB_CONFIG.map((tab) => ({
          key: tab.key,
          label: t(tab.labelKey),
          icon: tab.icon,
        }))}
        value={activeTab}
        onChange={(tab) => pagerRef.current?.navigate(tab)}
      />
      <View
        style={[
          styles.contentWrapper,
          useCenteredTabletLayout && styles.contentWrapperTablet,
          isLandscapeLayout && styles.contentWrapperLandscape,
        ]}
      >
        <SettingsTabPager
          ref={pagerRef}
          options={TAB_CONFIG}
          value={activeTab}
          onChange={setActiveTab}
          scopeKey="global"
          scrollViewProps={settingsScrollProps}
          renderPage={renderSettingsPage}
        />
      </View>
    </View>
  );
}
