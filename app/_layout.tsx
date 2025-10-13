// _layout.tsx
import { Stack } from "expo-router";
import Navbar from "@/src/components/navbar/navbar";
import React, { useEffect, useState, useCallback } from "react";
import { SettingsProvider } from "@/src/contexts/SettingsContext";
import { LearningStatsProvider } from "@/src/contexts/LearningStatsContext";
import { getDB } from "@/src/db/sqlite/db"; // ZMIANA: Importujemy tylko getDB
import * as SplashScreen from "expo-splash-screen";
import { View, ActivityIndicator, Text } from "react-native";
import { PopupProvider } from "@/src/contexts/PopupContext";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isDbReady, setDbReady] = useState(false);

  useEffect(() => {
    async function prepareApp() {
      try {
        await getDB();
        console.log("Baza danych gotowa do użycia.");
      } catch (e) {
        console.error("Błąd podczas inicjalizacji bazy danych:", e);
      } finally {
        setDbReady(true);
      }
    }

    prepareApp();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (isDbReady) {
      await SplashScreen.hideAsync();
    }
  }, [isDbReady]);

  if (!isDbReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          gap: 12,
        }}
      >
        <ActivityIndicator size="large" />
        <Text style={{ fontSize: 16, color: "#333", textAlign: "center" }}>
          Importuję dane z CSV…
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <SettingsProvider>
          <LearningStatsProvider>
            <PopupProvider>
              <Navbar>
                <Stack screenOptions={{ headerShown: false }} />
              </Navbar>
            </PopupProvider>
          </LearningStatsProvider>
        </SettingsProvider>
      </View>
    </SafeAreaProvider>
  );
}
