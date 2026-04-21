// _layout.tsx
import i18n from "@/src/i18n";
import Navbar from "@/src/components/navbar/navbar";
import { CoachmarkLayerPortalProvider } from "@/src/components/onboarding/CoachmarkLayerPortal";
import { OnboardingGate } from "@/src/components/onboarding/OnboardingGate";
import QuoteBubble from "@/src/components/quote/QuoteBubble";
import QuoteSystemInitializer from "@/src/components/quote/QuoteSystemInitializer";
import LearningRemindersInitializer from "@/src/components/reminders/LearningRemindersInitializer";
import GoogleDriveBackupInitializer from "@/src/components/reminders/GoogleDriveBackupInitializer";
import { LearningStatsProvider } from "@/src/contexts/LearningStatsContext";
import { NavbarStatsProvider } from "@/src/contexts/NavbarStatsContext";
import { PopupProvider } from "@/src/contexts/PopupContext";
import { QuoteProvider } from "@/src/contexts/QuoteContext";
import { SettingsProvider, useSettings } from "@/src/contexts/SettingsContext";
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
import { getStartupThemeUi, loadStartupTheme } from "@/src/theme/startupTheme";
import type { Theme } from "@/src/theme/theme";
import * as NavigationBar from "expo-navigation-bar";
import * as Notifications from "expo-notifications";
import { CoachmarkProvider } from "@edwardloopez/react-native-coachmark";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LEARNING_REMINDER_CHANNEL_ID } from "@/src/services/learningReminderNotifications";

SplashScreen.preventAutoHideAsync();
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const STARTUP_ICON = require("@/assets/app/icons/generated/ios/AppIcon~ios-marketing.png");

type RootStatus = "loading" | "ready" | "error" | "importing" | "resetting";

export default function RootLayout() {
  const { t } = useTranslation();
  const [startupTheme, setStartupTheme] = useState<Theme | null>(null);
  const [isStartupReady, setIsStartupReady] = useState(false);
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
  const rootViewLaidOutRef = useRef(false);

  const hideSplashOnce = useCallback(async () => {
    if (splashHiddenRef.current) {
      return;
    }
    splashHiddenRef.current = true;
    await SplashScreen.hideAsync();
  }, []);

  const onLayoutRootView = useCallback(() => {
    rootViewLaidOutRef.current = true;
    const shouldHideSplash =
      isStartupReady && (status === "ready" || status === "error");
    if (!shouldHideSplash) {
      return;
    }
    hideSplashOnce().catch((error) => {
      console.warn("[App] Splash hide failed", error);
    });
  }, [hideSplashOnce, isStartupReady, status]);

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
    let mounted = true;
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

    void loadStartupTheme()
      .then((theme) => {
        if (!mounted) {
          return;
        }
        setStartupTheme(theme);
        setIsStartupReady(true);
      })
      .catch((error) => {
        console.warn("[App] Failed to load startup theme", error);
        if (!mounted) {
          return;
        }
        setStartupTheme("light");
        setIsStartupReady(true);
      });

    void prepareApp();

    return () => {
      mounted = false;
      unsubscribe();
      unsubscribeDebugOverride();
      unsubscribeStartupPreview();
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [prepareApp]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    void Notifications.setNotificationChannelAsync(LEARNING_REMINDER_CHANNEL_ID, {
      name: i18n.t("settings.learning.reminders.title"),
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
    }).catch((error) => {
      console.warn("[Notifications] Failed to initialize learning reminders channel", error);
    });
  }, []);

  const shouldRenderApp = isStartupReady && status === "ready";
  const shouldRenderBlockingState =
    status === "error" || status === "importing" || status === "resetting";
  const shouldHideSplash =
    isStartupReady &&
    rootViewLaidOutRef.current &&
    (status === "ready" || status === "error");

  useEffect(() => {
    if (!shouldHideSplash) {
      return;
    }

    hideSplashOnce().catch((error) => {
      console.warn("[App] Splash hide failed", error);
    });
  }, [hideSplashOnce, shouldHideSplash]);

  const effectiveStartupTheme = startupTheme ?? "light";
  const startupUi = getStartupThemeUi(effectiveStartupTheme);

  useEffect(() => {
    if (!isStartupReady) {
      return;
    }

    void SystemUI.setBackgroundColorAsync(startupUi.backgroundColor).catch(
      (error) => {
        console.warn("[App] Failed to set system UI background", error);
      }
    );

    if (Platform.OS !== "android") {
      return;
    }

    void NavigationBar.setButtonStyleAsync(startupUi.statusBarStyle).catch(
      (error) => {
        console.warn("[App] Failed to set Android navigation bar buttons", error);
      }
    );
  }, [isStartupReady, startupUi.backgroundColor, startupUi.statusBarStyle]);

  const renderBlockingState = () => {
    if (status === "error") {
      return (
        <View
          style={[
            styles.blockingContainer,
            { backgroundColor: startupUi.backgroundColor },
          ]}
        >
          <Text style={[styles.errorTitle, { color: startupUi.primaryTextColor }]}>
            {t("app.error.title")}
          </Text>
          <Text style={[styles.errorText, { color: startupUi.secondaryTextColor }]}>
            {t("app.error.description")}
          </Text>
          <Text style={[styles.errorText, { color: startupUi.secondaryTextColor }]}>
            {t("app.error.backupHint")}
          </Text>
          {isDebugErrorOverride ? (
            <Text
              style={[
                styles.debugBadge,
                {
                  backgroundColor: startupUi.errorBadgeBackgroundColor,
                  color: startupUi.errorBadgeTextColor,
                },
              ]}
            >
              {t("app.error.debugBadge")}
            </Text>
          ) : null}
          {errorMessage ? (
            <Text style={[styles.errorReason, { color: startupUi.errorTextColor }]}>
              {errorMessage}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <ActionButton
              label={t("app.error.actions.retry")}
              startupUi={startupUi}
              onPress={() => {
                void handleRetry();
              }}
            />
            <ActionButton
              label={t("app.error.actions.importBackup")}
              variant="ghost"
              startupUi={startupUi}
              onPress={() => {
                void handleImportBackup();
              }}
            />
            <ActionButton
              label={t("app.error.actions.reset")}
              variant="secondary"
              startupUi={startupUi}
              onPress={handleResetApp}
            />
          </View>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.blockingContainer,
          { backgroundColor: startupUi.backgroundColor },
        ]}
      >
        <Image
          source={STARTUP_ICON}
          style={[styles.loadingLogo, { shadowColor: startupUi.shadowColor }]}
          resizeMode="contain"
        />
        <Text style={[styles.loadingText, { color: startupUi.primaryTextColor }]}>
          {previewLoadingMessageKey
            ? t(previewLoadingMessageKey)
            : status === "importing"
            ? t("app.error.actions.importing")
            : status === "resetting"
              ? t("app.error.actions.resetting")
              : t(loadingMessageKey)}
        </Text>
      </View>
    );
  };

  const renderPreviewOverlay = () => {
    if (previewLoadingMessageKey == null) {
      return null;
    }

    return (
      <View style={styles.previewOverlay}>
        <View
          style={[
            styles.blockingContainer,
            { backgroundColor: startupUi.backgroundColor },
          ]}
        >
          <Image
            source={STARTUP_ICON}
            style={[styles.loadingLogo, { shadowColor: startupUi.shadowColor }]}
            resizeMode="contain"
          />
          <Text style={[styles.loadingText, { color: startupUi.primaryTextColor }]}>
            {t(previewLoadingMessageKey)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaProvider>
      <View
        style={[styles.root, { backgroundColor: startupUi.backgroundColor }]}
        onLayout={onLayoutRootView}
      >
        {shouldRenderApp ? (
          <SettingsProvider initialTheme={effectiveStartupTheme}>
            <CoachmarkProvider>
              <AppThemeSystemUiSync />
              <QuoteProvider>
                <QuoteSystemInitializer />
                <LearningRemindersInitializer />
                <GoogleDriveBackupInitializer />
                <LearningStatsProvider>
                  <NavbarStatsProvider>
                    <PopupProvider>
                      <CoachmarkLayerPortalProvider>
                        <Navbar>
                          <OnboardingGate />
                          <Stack screenOptions={{ headerShown: false }} />
                        </Navbar>
                        <QuoteBubble />
                      </CoachmarkLayerPortalProvider>
                    </PopupProvider>
                  </NavbarStatsProvider>
                </LearningStatsProvider>
              </QuoteProvider>
            </CoachmarkProvider>
          </SettingsProvider>
        ) : shouldRenderBlockingState ? (
          <>
            <StatusBar style={startupUi.statusBarStyle} />
            {renderBlockingState()}
          </>
        ) : null}
        {shouldRenderApp ? renderPreviewOverlay() : null}
      </View>
    </SafeAreaProvider>
  );
}

function ActionButton({
  label,
  onPress,
  variant = "primary",
  startupUi,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  startupUi: ReturnType<typeof getStartupThemeUi>;
}) {
  const backgroundColor =
    variant === "secondary"
      ? startupUi.secondaryButtonBackgroundColor
      : variant === "ghost"
        ? startupUi.ghostButtonBackgroundColor
        : startupUi.primaryButtonBackgroundColor;
  const textColor =
    variant === "secondary"
      ? startupUi.secondaryButtonTextColor
      : variant === "ghost"
        ? startupUi.ghostButtonTextColor
        : startupUi.primaryButtonTextColor;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor,
          borderColor:
            variant === "ghost" ? startupUi.ghostButtonBorderColor : "transparent",
          borderWidth: variant === "ghost" ? 1 : 0,
        },
        pressed && styles.actionButtonPressed,
      ]}
    >
      <Text style={[styles.actionButtonText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

function AppThemeSystemUiSync() {
  const { theme } = useSettings();
  const currentUi = getStartupThemeUi(theme);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(currentUi.backgroundColor).catch(
      (error) => {
        console.warn("[App] Failed to sync system UI background", error);
      },
    );

    if (Platform.OS !== "android") {
      return;
    }

    void NavigationBar.setButtonStyleAsync(currentUi.statusBarStyle).catch(
      (error) => {
        console.warn("[App] Failed to sync Android navigation bar buttons", error);
      },
    );
  }, [currentUi.backgroundColor, currentUi.statusBarStyle]);

  return <StatusBar style={currentUi.statusBarStyle} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  blockingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 22,
  },
  loadingLogo: {
    width: 176,
    height: 176,
    borderRadius: 34,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
    marginBottom: 2,
  },
  loadingText: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600",
    textAlign: "center",
    maxWidth: 260,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 420,
  },
  errorReason: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 420,
  },
  debugBadge: {
    fontSize: 13,
    fontWeight: "600",
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
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionButtonPressed: {
    opacity: 0.85,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
