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
import { Image, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useStyles } from "./LanguageIntroScreen-styles";

type LanguageOption = {
  key: UiLanguage | NativeLanguage;
  flagCode: "pl" | "en";
  title: string;
  subtitle: string;
};
type LanguageIntroMode = "app" | "native";

const languageOptions: LanguageOption[] = [
  {
    key: "pl",
    flagCode: "pl",
    title: "Polski",
    subtitle: "Interfejs po polsku",
  },
  {
    key: "en",
    flagCode: "en",
    title: "English",
    subtitle: "Interface in English",
  },
];

export default function LanguageIntroScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const router = useRouter();
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
      }
    : {
        appTitle: "Choose app language",
        nativeTitle: "Your native language",
        confirm: "Next",
        hintDefault: "Choose a language to enable the button.",
        hintSelected: "Selected: {{language}}",
      };

  const tr = useCallback(
    (
      key:
        | "onboarding.languageIntro.appTitle"
        | "onboarding.languageIntro.nativeTitle"
        | "onboarding.languageIntro.confirm"
        | "onboarding.languageIntro.hintDefault"
        | "onboarding.languageIntro.hintSelected",
      options?: Record<string, unknown>
    ) => t(key, { lng: screenLanguage, ...options }),
    [screenLanguage, t]
  );

  useEffect(() => {
    let mounted = true;
    getOnboardingCheckpoint().then((checkpoint) => {
      if (!mounted) return;
      const nextMode =
        checkpoint === "native_language_required" ? "native" : "app";
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
      await setOnboardingCheckpoint("pin_required");
      router.replace("/createcourse");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title} allowFontScaling>
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
                  accessibilityLabel={`${option.title}. ${option.subtitle}`}
                  accessibilityState={{ selected: isActive }}
                  onPress={() => onSelectLanguage(option.key)}
                >
                  <Image source={source} style={styles.languageFlag} />
                  <View style={styles.languageInfo}>
                    <Text style={styles.languageTitle} allowFontScaling>
                      {option.title}
                    </Text>
                    <Text style={styles.languageSubtitle} allowFontScaling>
                      {mode === "app"
                        ? option.subtitle
                        : screenLanguage === "pl"
                          ? "Język ojczysty"
                          : "Native language"}
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
              text={tr("onboarding.languageIntro.confirm", {
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
