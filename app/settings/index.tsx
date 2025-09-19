import React, { useState } from "react";
import { View, TouchableOpacity, Text, ScrollView } from "react-native";
import { useStyles } from "../../src/screens/settings/styles_settings";
import AppearanceSection from "@/src/components/settings/AppearanceSection";
import LearningSection from "@/src/components/settings/LearningSection";
import DataSection from "@/src/components/settings/DataSection";

const TAB_CONFIG = [
  { key: "appearance", label: "Wygląd" },
  { key: "learning", label: "Nauka" },
  { key: "data", label: "Dane" },
] as const;

type TabKey = (typeof TAB_CONFIG)[number]["key"];

export default function Settings() {
  const styles = useStyles();
  const [activeTab, setActiveTab] = useState<TabKey>(TAB_CONFIG[0].key);

  return (
    <View style={styles.container}>
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
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.key && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "appearance" && <AppearanceSection />}
        {activeTab === "learning" && <LearningSection />}
        {activeTab === "data" && <DataSection />}
      </ScrollView>
    </View>
  );
}
