// _layout.tsx
import { Stack } from "expo-router";
import Navbar from "@/src/components/navbar/navbar";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { SettingsProvider } from "@/src/contexts/SettingsContext";
import { LearningStatsProvider } from "@/src/contexts/LearningStatsContext";
import {
  getDB,
  addDbInitializationListener,
  type DbInitializationEvent,
} from "@/src/db/sqlite/db";
import * as SplashScreen from "expo-splash-screen";
import { View, ActivityIndicator, Text } from "react-native";
import { PopupProvider } from "@/src/contexts/PopupContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import OnboardingGate from "@/src/components/onboarding/OnboardingGate";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isDbReady, setDbReady] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Wczytuję aplikację…");
  const [isInitialImport, setIsInitialImport] = useState(false);
  const splashHiddenRef = useRef(false);

  const hideSplashOnce = useCallback(async () => {
    if (splashHiddenRef.current) {
      return;
    }
    splashHiddenRef.current = true;
    await SplashScreen.hideAsync();
  }, []);

  const onLayoutRootView = useCallback(() => {
    hideSplashOnce().catch((error) => {
      console.warn("[App] Splash hide failed", error);
    });
  }, [hideSplashOnce]);

  useEffect(() => {
    const handleDbEvent = (event: DbInitializationEvent) => {
      switch (event.type) {
        case "start":
          setIsInitialImport(false);
          setLoadingMessage("Wczytuję aplikację…");
          break;
        case "import-start":
          setIsInitialImport(true);
          setLoadingMessage("Importuję dane z CSV…");
          break;
        case "import-finish":
          setLoadingMessage("Kończę konfigurację…");
          break;
        case "ready":
          setIsInitialImport(event.initialImport);
          setLoadingMessage("Uruchamiam aplikację…");
          break;
        case "error":
          setLoadingMessage("Nie udało się przygotować bazy danych. Sprawdź logi.");
          break;
      }
    };

    const unsubscribe = addDbInitializationListener(handleDbEvent);

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
    return unsubscribe;
  }, []);

  if (!isDbReady) {
    return (
      <View
        onLayout={onLayoutRootView}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          gap: 12,
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" />
        <Text style={{ fontSize: 16, color: "#333", textAlign: "center" }}>
          {loadingMessage}
        </Text>
        {isInitialImport ? (
          <Text style={{ fontSize: 14, color: "#666", textAlign: "center" }}>
            Pierwsze uruchomienie może potrwać kilkanaście sekund.
          </Text>
        ) : null}
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
                <OnboardingGate />
                <Stack screenOptions={{ headerShown: false }} />
              </Navbar>
            </PopupProvider>
          </LearningStatsProvider>
        </SettingsProvider>
      </View>
    </SafeAreaProvider>
  );
}
