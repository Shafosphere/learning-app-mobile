// _layout.tsx
import { Stack } from "expo-router";
import Navbar from "@/src/components/navbar/navbar";
import React, { useEffect, useState, useCallback } from "react";
import { SettingsProvider } from "@/src/contexts/SettingsContext";
import { getDB } from "@/src/components/db/db"; // ZMIANA: Importujemy tylko getDB
import * as SplashScreen from "expo-splash-screen";
import { View } from "react-native";
import { PopupProvider } from "@/src/contexts/PopupContext";

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
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SettingsProvider>
        <PopupProvider>
          <Navbar />
          <Stack screenOptions={{ headerShown: false }} />
        </PopupProvider>
      </SettingsProvider>
    </View>
  );
}
