// _layout.tsx
import i18n from "@/src/i18n";
import Navbar from "@/src/components/navbar/navbar";
import { OnboardingGate } from "@/src/components/onboarding/OnboardingGate";
import QuoteBubble from "@/src/components/quote/QuoteBubble";
import QuoteSystemInitializer from "@/src/components/quote/QuoteSystemInitializer";
import LearningRemindersInitializer from "@/src/components/reminders/LearningRemindersInitializer";
import GoogleDriveBackupInitializer from "@/src/components/reminders/GoogleDriveBackupInitializer";
import { LearningStatsProvider } from "@/src/contexts/LearningStatsContext";
import { NavbarStatsProvider } from "@/src/contexts/NavbarStatsContext";
import { PopupProvider } from "@/src/contexts/PopupContext";
import { QuoteProvider } from "@/src/contexts/QuoteContext";
import { SettingsProvider } from "@/src/contexts/SettingsContext";
import {
  addDbInitializationListener,
  deleteAndReinitializeDB,
  getDB,
  retryDbInitialization,
  type DbInitializationEvent,
} from "@/src/db/sqlite/db";
import {
  clearDbInitDebugOverride,
  isDbInitDebugOverrideEnabled,
  subscribeDbInitDebugOverride,
} from "@/src/services/dbInitDebugOverride";
import { importUserData } from "@/src/services/importUserData";
import { initializeGoogleDriveBackup } from "@/src/services/googleDriveBackup";
import { subscribeStartupScreenPreview } from "@/src/services/startupScreenPreview";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

const STARTUP_ICON = require("@/assets/app/icons/generated/web/icon-192.png");

type RootStatus = "loading" | "ready" | "error" | "importing" | "resetting";

export default function RootLayout() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<RootStatus>("loading");
  const [loadingMessageKey, setLoadingMessageKey] = useState(
    "app.loading.initializing"
  );
  const [previewLoadingMessageKey, setPreviewLoadingMessageKey] = useState<string | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDebugErrorOverride, setIsDebugErrorOverride] = useState(false);
  const splashHiddenRef = useRef(false);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const prepareApp = useCallback(
    async (options?: { retry?: boolean; clearDebugOverride?: boolean }) => {
      const { retry = false, clearDebugOverride = false } = options ?? {};
      setStatus("loading");
      setErrorMessage(null);
      setIsDebugErrorOverride(false);

      try {
        if (clearDebugOverride) {
          await clearDbInitDebugOverride();
        }

        await (retry ? retryDbInitialization() : getDB());

        const debugOverrideEnabled = await isDbInitDebugOverrideEnabled();
        if (debugOverrideEnabled) {
          setIsDebugErrorOverride(true);
          setErrorMessage(i18n.t("app.error.debugMessage"));
          setStatus("error");
          return;
        }

        setStatus("ready");
      } catch (error) {
        console.error("Błąd podczas inicjalizacji bazy danych:", error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : i18n.t("app.error.genericReason")
        );
        setStatus("error");
      }
    },
    []
  );

  const handleRetry = useCallback(async () => {
    await prepareApp({
      retry: !isDebugErrorOverride,
      clearDebugOverride: isDebugErrorOverride,
    });
  }, [isDebugErrorOverride, prepareApp]);

  const handleImportBackup = useCallback(async () => {
    setStatus("importing");
    setErrorMessage(null);

    try {
      await clearDbInitDebugOverride();
      await deleteAndReinitializeDB();
      const result = await importUserData();

      if (result.success) {
        setIsDebugErrorOverride(false);
        await prepareApp();
        return;
      }

      if (result.message === "Anulowano wybór pliku.") {
        await prepareApp();
        return;
      }

      setStatus("error");
      if (result.message) {
        setErrorMessage(result.message);
      }
    } catch (error) {
      console.error("[App] Failed to import backup", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : i18n.t("app.error.genericReason")
      );
      setStatus("error");
    }
  }, [prepareApp]);

  const handleResetApp = useCallback(() => {
    Alert.alert(
      t("app.error.reset.confirmTitle"),
      t("app.error.reset.confirmMessage"),
      [
        {
          text: t("app.error.reset.cancel"),
          style: "cancel",
        },
        {
          text: t("app.error.reset.confirm"),
          style: "destructive",
          onPress: () => {
            void (async () => {
              setStatus("resetting");
              setErrorMessage(null);

              try {
                await clearDbInitDebugOverride();
                await deleteAndReinitializeDB();
                setIsDebugErrorOverride(false);
                await prepareApp();
              } catch (error) {
                console.error("[App] Failed to reset app database", error);
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : i18n.t("app.error.genericReason")
                );
                setStatus("error");
              }
            })();
          },
        },
      ]
    );
  }, [prepareApp, t]);

  useEffect(() => {
    initializeGoogleDriveBackup();

    const handleDbEvent = (event: DbInitializationEvent) => {
      switch (event.type) {
        case "start":
          setLoadingMessageKey("app.loading.initializing");
          break;
        case "import-start":
          setLoadingMessageKey("app.loading.importingCsv");
          break;
        case "import-finish":
          setLoadingMessageKey("app.loading.finishingSetup");
          break;
        case "ready":
          setLoadingMessageKey("app.loading.launching");
          break;
        case "error":
          setLoadingMessageKey("app.loading.dbError");
          break;
      }
    };

    const unsubscribe = addDbInitializationListener(handleDbEvent);
    const unsubscribeDebugOverride = subscribeDbInitDebugOverride((enabled) => {
      setIsDebugErrorOverride(enabled);
      if (enabled) {
        setErrorMessage(i18n.t("app.error.debugMessage"));
        setStatus("error");
      }
    });
    const unsubscribeStartupPreview = subscribeStartupScreenPreview(
      ({ durationMs, messageKey }) => {
        if (previewTimeoutRef.current) {
          clearTimeout(previewTimeoutRef.current);
        }

        setPreviewLoadingMessageKey(messageKey);
        previewTimeoutRef.current = setTimeout(() => {
          setPreviewLoadingMessageKey(null);
          previewTimeoutRef.current = null;
        }, durationMs);
      }
    );

    void prepareApp();

    return () => {
      unsubscribe();
      unsubscribeDebugOverride();
      unsubscribeStartupPreview();
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [prepareApp]);

  const renderBlockingState = () => {
    if (status === "error") {
      return (
        <View style={styles.blockingContainer}>
          <Text style={styles.errorTitle}>{t("app.error.title")}</Text>
          <Text style={styles.errorText}>{t("app.error.description")}</Text>
          <Text style={styles.errorText}>{t("app.error.backupHint")}</Text>
          {isDebugErrorOverride ? (
            <Text style={styles.debugBadge}>{t("app.error.debugBadge")}</Text>
          ) : null}
          {errorMessage ? <Text style={styles.errorReason}>{errorMessage}</Text> : null}
          <View style={styles.actions}>
            <ActionButton
              label={t("app.error.actions.retry")}
              onPress={() => {
                void handleRetry();
              }}
            />
            <ActionButton
              label={t("app.error.actions.importBackup")}
              variant="ghost"
              onPress={() => {
                void handleImportBackup();
              }}
            />
            <ActionButton
              label={t("app.error.actions.reset")}
              variant="secondary"
              onPress={handleResetApp}
            />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.blockingContainer}>
        <View style={styles.loadingLogoWrap}>
          <Image source={STARTUP_ICON} style={styles.loadingLogo} resizeMode="contain" />
        </View>
        <Text style={styles.loadingText}>
          {previewLoadingMessageKey
            ? t(previewLoadingMessageKey)
            : status === "importing"
            ? t("app.error.actions.importing")
            : status === "resetting"
              ? t("app.error.actions.resetting")
              : t(loadingMessageKey)}
        </Text>
        <ActivityIndicator size="large" color="#22577a" />
      </View>
    );
  };

  const renderPreviewOverlay = () => {
    if (previewLoadingMessageKey == null) {
      return null;
    }

    return (
      <View style={styles.previewOverlay}>
        <View style={styles.blockingContainer}>
          <View style={styles.loadingLogoWrap}>
            <Image source={STARTUP_ICON} style={styles.loadingLogo} resizeMode="contain" />
          </View>
          <Text style={styles.loadingText}>{t(previewLoadingMessageKey)}</Text>
          <ActivityIndicator size="large" color="#22577a" />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        {status === "ready" ? (
          <SettingsProvider>
            <QuoteProvider>
              <QuoteSystemInitializer />
              <LearningRemindersInitializer />
              <GoogleDriveBackupInitializer />
              <LearningStatsProvider>
                <NavbarStatsProvider>
                  <PopupProvider>
                    <Navbar>
                      <OnboardingGate />
                      <Stack screenOptions={{ headerShown: false }} />
                    </Navbar>
                    <QuoteBubble />
                  </PopupProvider>
                </NavbarStatsProvider>
              </LearningStatsProvider>
            </QuoteProvider>
          </SettingsProvider>
        ) : (
          renderBlockingState()
        )}
        {status === "ready" ? renderPreviewOverlay() : null}
      </View>
    </SafeAreaProvider>
  );
}

function ActionButton({
  label,
  onPress,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        variant === "secondary" && styles.actionButtonSecondary,
        variant === "ghost" && styles.actionButtonGhost,
        pressed && styles.actionButtonPressed,
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          variant === "secondary" && styles.actionButtonTextSecondary,
          variant === "ghost" && styles.actionButtonTextGhost,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  blockingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 18,
    backgroundColor: "#fffdf8",
  },
  loadingLogoWrap: {
    width: 148,
    height: 148,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 36,
    backgroundColor: "#ffffff",
    shadowColor: "#d6e4f0",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 6,
    marginBottom: 6,
  },
  loadingLogo: {
    width: 112,
    height: 112,
  },
  loadingText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "600",
    color: "#2f3e46",
    textAlign: "center",
    maxWidth: 280,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4b5563",
    textAlign: "center",
    maxWidth: 420,
  },
  errorReason: {
    fontSize: 13,
    lineHeight: 18,
    color: "#991b1b",
    textAlign: "center",
    maxWidth: 420,
  },
  debugBadge: {
    fontSize: 13,
    fontWeight: "600",
    color: "#92400e",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  actions: {
    width: "100%",
    maxWidth: 320,
    gap: 10,
    marginTop: 8,
  },
  actionButton: {
    borderRadius: 16,
    backgroundColor: "#1f7a5c",
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionButtonSecondary: {
    backgroundColor: "#f6c453",
  },
  actionButtonGhost: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  actionButtonPressed: {
    opacity: 0.85,
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  actionButtonTextSecondary: {
    color: "#1f2937",
  },
  actionButtonTextGhost: {
    color: "#374151",
  },
});
