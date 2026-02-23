// _layout.tsx
import "@/src/i18n";
import Navbar from "@/src/components/navbar/navbar";
import OnboardingGate from "@/src/components/onboarding/OnboardingGate";
import QuoteBubble from "@/src/components/quote/QuoteBubble";
import QuoteSystemInitializer from "@/src/components/quote/QuoteSystemInitializer";
import { LearningStatsProvider } from "@/src/contexts/LearningStatsContext";
import { PopupProvider } from "@/src/contexts/PopupContext";
import { QuoteProvider } from "@/src/contexts/QuoteContext";
import { SettingsProvider } from "@/src/contexts/SettingsContext";
import {
  addDbInitializationListener,
  getDB,
  type DbInitializationEvent,
} from "@/src/db/sqlite/db";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { t } = useTranslation();
  const [isDbReady, setDbReady] = useState(false);
  const [loadingMessageKey, setLoadingMessageKey] = useState(
    "app.loading.initializing"
  );
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
          setLoadingMessageKey("app.loading.initializing");
          break;
        case "import-start":
          setIsInitialImport(true);
          setLoadingMessageKey("app.loading.importingCsv");
          break;
        case "import-finish":
          setLoadingMessageKey("app.loading.finishingSetup");
          break;
        case "ready":
          setIsInitialImport(event.initialImport);
          setLoadingMessageKey("app.loading.launching");
          break;
        case "error":
          setLoadingMessageKey("app.loading.dbError");
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
          {t(loadingMessageKey)}
        </Text>
        {isInitialImport ? (
          <Text style={{ fontSize: 14, color: "#666", textAlign: "center" }}>
            {t("app.loading.firstLaunchInfo")}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <SettingsProvider>
          <QuoteProvider>
            <QuoteSystemInitializer />
            <LearningStatsProvider>
              <PopupProvider>
                <Navbar>
                  <OnboardingGate />
                  <Stack screenOptions={{ headerShown: false }} />
                </Navbar>
                <QuoteBubble />
              </PopupProvider>
            </LearningStatsProvider>
          </QuoteProvider>
        </SettingsProvider>
      </View>
    </SafeAreaProvider>
  );
}
