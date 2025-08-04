import { Stack } from "expo-router";
import Navbar from "@/src/components/navbar/navbar";
import React, { useEffect, useState, useCallback } from "react";
import { SettingsProvider } from "@/src/contexts/SettingsContext";
import { initDB } from "@/src/components/db/db";
import * as SplashScreen from "expo-splash-screen";
import { View } from "react-native";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isDbReady, setDbReady] = useState(false);

  useEffect(() => {
    async function prepareApp() {
      try {
        await initDB();
        console.log("Inicjalizacja bazy danych zakończona pomyślnie.");
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
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SettingsProvider>
        <Navbar />
        <Stack screenOptions={{ headerShown: false }} />
      </SettingsProvider>
    </View>
  );
}