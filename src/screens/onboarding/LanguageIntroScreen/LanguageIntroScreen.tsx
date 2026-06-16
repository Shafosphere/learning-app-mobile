import MyButton from "@/src/components/button/button";
import { getFlagSource } from "@/src/constants/languageFlags";
import { useSettings } from "@/src/contexts/SettingsContext";
import i18n from "@/src/i18n";
import type { NativeLanguage, UiLanguage } from "@/src/i18n";
import {
  getOnboardingCheckpoint,
  setOnboardingCheckpoint,
} from "@/src/services/onboardingCheckpoint";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useStyles } from "./LanguageIntroScreen-styles";

type LanguageOption = {
  key: UiLanguage | NativeLanguage;
  flagCode: "pl" | "en";
  titleKey: "repeats.labels.polish" | "repeats.labels.english";
  subtitle: string;
};
type LanguageIntroMode = "app" | "native" | "welcome";

const languageOptions: LanguageOption[] = [
  {
    key: "pl",
    flagCode: "pl",
    titleKey: "repeats.labels.polish",
    subtitle: "Interfejs po polsku",
  },
  {
    key: "en",
    flagCode: "en",
    titleKey: "repeats.labels.english",
    subtitle: "Interface in English",
  },
];

const WELCOME_LOGO_SOURCE = require("@/assets/illustrations/mascot-box/branding/logo.png");

export default function LanguageIntroScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const router = useRouter();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const {
    uiLanguage,
    nativeLanguage,
    setUiLanguage,
    setNativeLanguage,
    colors,
  } = useSettings();
  const [mode, setMode] = useState<LanguageIntroMode>("app");
  const [selectedLanguage, setSelectedLanguage] = useState<
    UiLanguage | NativeLanguage
  >(uiLanguage);
  const [isSaving, setIsSaving] = useState(false);
  const screenLanguage = mode === "app" ? selectedLanguage : uiLanguage;
  const fallback = screenLanguage === "pl"
    ? {
        appTitle: "Wybierz język aplikacji",
        nativeTitle: "Twój język ojczysty",
        confirm: "Dalej",
        hintDefault: "Wybierz język, żeby aktywować przycisk.",
        hintSelected: "Wybrano: {{language}}",
        welcomeTitle: "Witaj w Memicard!",
        welcomeDescription:
          "Dzięki, że jesteś tutaj na wczesnym etapie rozwoju aplikacji.\n\nMemicard nadal rośnie, więc mogą pojawić się drobne błędy, niedopracowane miejsca albo funkcje, które jeszcze wymagają poprawy.\n\nJeżeli coś nie działa, coś Ci przeszkadza albo masz pomysł na ulepszenie, zgłoś to proszę — bardzo mi to pomoże.",
        welcomeNext: "Zaczynajmy",
      }
    : {
        appTitle: "Choose app language",
        nativeTitle: "Your native language",
        confirm: "Next",
        hintDefault: "Choose a language to enable the button.",
        hintSelected: "Selected: {{language}}",
        welcomeTitle: "Welcome to Memicard!",
        welcomeDescription:
          "Thank you for being here at this early stage of the app's development.\n\nMemicard is still growing, so you may come across small bugs, unfinished areas, or features that still need improvement.\n\nIf something does not work, bothers you, or you have an idea for an improvement, please report it - it would help me a lot.",
        welcomeNext: "Let's start",
      };

  const tr = useCallback(
    (
      key:
        | "onboarding.languageIntro.appTitle"
        | "onboarding.languageIntro.nativeTitle"
        | "app.actions.next"
        | "onboarding.languageIntro.hintDefault"
        | "onboarding.languageIntro.hintSelected"
        | "onboarding.welcome.title"
        | "onboarding.welcome.description"
        | "onboarding.welcome.next",
      options?: Record<string, unknown>
    ) => t(key, { lng: screenLanguage, ...options }),
    [screenLanguage, t]
  );

  useEffect(() => {
    let mounted = true;
    getOnboardingCheckpoint().then((checkpoint) => {
      if (!mounted) return;
      const nextMode =
        checkpoint === "welcome_required"
          ? "welcome"
          : checkpoint === "native_language_required"
            ? "native"
            : "app";
      setMode(nextMode);
      setSelectedLanguage(nextMode === "native" ? nativeLanguage : uiLanguage);
    });
    return () => {
      mounted = false;
    };
  }, [nativeLanguage, uiLanguage]);

  const onSelectLanguage = useCallback(
    (language: UiLanguage | NativeLanguage) => {
      if (isSaving) return;
      setSelectedLanguage(language);
      if (mode === "native") {
        void setNativeLanguage(language).catch((error) => {
          console.warn("[LanguageIntro] Failed to apply native language", error);
        });
        return;
      }
      void Promise.all([
        i18n.changeLanguage(language as UiLanguage),
        setUiLanguage(language as UiLanguage),
      ]).catch((error) => {
        console.warn("[LanguageIntro] Failed to apply language immediately", error);
      });
    },
    [isSaving, mode, setNativeLanguage, setUiLanguage]
  );

  const onConfirm = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (mode === "app") {
        await setOnboardingCheckpoint("native_language_required");
        setMode("native");
        setSelectedLanguage(selectedLanguage as NativeLanguage);
        return;
      }
      await setNativeLanguage(selectedLanguage as NativeLanguage);
      await setOnboardingCheckpoint("welcome_required");
      setMode("welcome");
    } finally {
      setIsSaving(false);
    }
  };

  const onWelcomeConfirm = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await setOnboardingCheckpoint("pin_required");
      router.replace("/createcourse");
    } finally {
      setIsSaving(false);
    }
  };

  if (mode === "welcome") {
    const isCompactWelcome = screenHeight < 720 || screenWidth < 360;

    return (
      <View style={styles.welcomeContainer}>
        <ScrollView
          style={styles.welcomeScroll}
          contentContainerStyle={styles.welcomeContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeLogoWrap}>
              <Image
                source={WELCOME_LOGO_SOURCE}
                style={[
                  styles.welcomeLogo,
                  isCompactWelcome && styles.welcomeLogoCompact,
                ]}
                resizeMode="contain"
              />
            </View>
            <Text
              style={[
                styles.welcomeTitle,
                isCompactWelcome && styles.welcomeTitleCompact,
              ]}
              allowFontScaling
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
            >
              {tr("onboarding.welcome.title", {
                defaultValue: fallback.welcomeTitle,
              })}
            </Text>
            <View
              style={[
                styles.welcomeMessage,
                isCompactWelcome && styles.welcomeMessageCompact,
              ]}
            >
              <Text
                style={[
                  styles.welcomeDescription,
                  isCompactWelcome && styles.welcomeDescriptionCompact,
                ]}
                allowFontScaling
              >
                {tr("onboarding.welcome.description", {
                  defaultValue: fallback.welcomeDescription,
                })}
              </Text>
            </View>
            <View style={styles.welcomeActions}>
              <MyButton
                text={tr("onboarding.welcome.next", {
                  defaultValue: fallback.welcomeNext,
                })}
                onPress={onWelcomeConfirm}
                disabled={isSaving}
                color="my_green"
                width="100%"
                textStyle={styles.welcomeButtonText}
                style={styles.welcomeButton}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text
            style={styles.title}
            allowFontScaling
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            {tr(
              mode === "app"
                ? "onboarding.languageIntro.appTitle"
                : "onboarding.languageIntro.nativeTitle",
              {
                defaultValue:
                  mode === "app" ? fallback.appTitle : fallback.nativeTitle,
              }
            )}
          </Text>

          <View style={styles.languageTiles}>
            {languageOptions.map((option) => {
              const isActive = selectedLanguage === option.key;
              const source = getFlagSource(option.flagCode, "active");
              const title = t(option.titleKey, { lng: screenLanguage });
              const subtitle = mode === "app"
                ? option.subtitle
                : screenLanguage === "pl"
                  ? "Język ojczysty"
                  : "Native language";
              if (!source) return null;

              return (
                <Pressable
                  key={option.key}
                  style={({ pressed }) => [
                    styles.languageTile,
                    isActive && styles.languageTileActive,
                    pressed && styles.languageTilePressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t(
                    "screens.onboarding.languageIntro.languageIntro.accessibilityLabel.valueValue",
                    {
                      lng: screenLanguage,
                      title,
                      subtitle,
                      defaultValue: [title, subtitle].join(". "),
                    }
                  )}
                  accessibilityState={{ selected: isActive }}
                  onPress={() => onSelectLanguage(option.key)}
                >
                  <Image source={source} style={styles.languageFlag} />
                  <View style={styles.languageInfo}>
                    <Text style={styles.languageTitle} allowFontScaling>
                      {title}
                    </Text>
                    <Text style={styles.languageSubtitle} allowFontScaling>
                      {subtitle}
                    </Text>
                  </View>
                  <Ionicons
                    name={isActive ? "checkmark-circle" : "ellipse-outline"}
                    size={34}
                    color={colors.headline}
                  />
                </Pressable>
              );
            })}
          </View>

          <View style={styles.confirmWrap}>
            <MyButton
              text={tr("app.actions.next", {
                defaultValue: fallback.confirm,
              })}
              onPress={onConfirm}
              disabled={isSaving}
              color="my_green"
              width={154}
            />
            <Text style={styles.hint} allowFontScaling>
              {selectedLanguage
                ? tr("onboarding.languageIntro.hintSelected", {
                    language: selectedLanguage.toUpperCase(),
                    defaultValue: fallback.hintSelected,
                  })
                : tr("onboarding.languageIntro.hintDefault", {
                    defaultValue: fallback.hintDefault,
                  })}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
