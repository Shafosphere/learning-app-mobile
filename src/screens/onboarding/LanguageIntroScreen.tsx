import MyButton from "@/src/components/button/button";
import { getFlagSource } from "@/src/constants/languageFlags";
import { useSettings } from "@/src/contexts/SettingsContext";
import i18n from "@/src/i18n";
import type { UiLanguage } from "@/src/i18n";
import { setOnboardingCheckpoint } from "@/src/services/onboardingCheckpoint";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useStyles } from "./LanguageIntroScreen-styles";

type LanguageOption = {
  key: UiLanguage;
  flagCode: "pl" | "en";
  labelKey: "onboarding.languageIntro.polish" | "onboarding.languageIntro.english";
};

const languageOptions: LanguageOption[] = [
  { key: "pl", flagCode: "pl", labelKey: "onboarding.languageIntro.polish" },
  { key: "en", flagCode: "en", labelKey: "onboarding.languageIntro.english" },
];

export default function LanguageIntroScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const router = useRouter();
  const { uiLanguage, setUiLanguage } = useSettings();
  const [selectedLanguage, setSelectedLanguage] = useState<UiLanguage>(uiLanguage);
  const [isSaving, setIsSaving] = useState(false);
  const screenLanguage = selectedLanguage ?? uiLanguage;
  const fallback = screenLanguage === "pl"
    ? {
        title: "Zaznacz twój język ojczysty",
        confirm: "Dalej",
        polish: "Polski",
        english: "English",
        hintDefault: "Wybierz język, żeby aktywować przycisk.",
        hintSelected: "Wybrano: {{language}}",
      }
    : {
        title: "Choose your native language",
        confirm: "Next",
        polish: "Polish",
        english: "English",
        hintDefault: "Choose a language to enable the button.",
        hintSelected: "Selected: {{language}}",
      };

  const tr = useCallback(
    (
      key:
        | "onboarding.languageIntro.title"
        | "onboarding.languageIntro.confirm"
        | "onboarding.languageIntro.polish"
        | "onboarding.languageIntro.english"
        | "onboarding.languageIntro.hintDefault"
        | "onboarding.languageIntro.hintSelected",
      options?: Record<string, unknown>
    ) => t(key, { lng: screenLanguage, ...options }),
    [screenLanguage, t]
  );

  const onSelectLanguage = useCallback(
    (language: UiLanguage) => {
      if (isSaving) return;
      setSelectedLanguage(language);
      void Promise.all([
        i18n.changeLanguage(language),
        setUiLanguage(language),
      ]).catch((error) => {
        console.warn("[LanguageIntro] Failed to apply language immediately", error);
      });
    },
    [isSaving, setUiLanguage]
  );

  const onConfirm = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
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
            {tr("onboarding.languageIntro.title", {
              defaultValue: fallback.title,
            })}
          </Text>

          <View style={styles.flagsWrap}>
            {languageOptions.map((option) => {
              const isActive = selectedLanguage === option.key;
              const source = getFlagSource(option.flagCode, "active");
              if (!source) return null;

              return (
                <Pressable
                  key={option.key}
                  style={({ pressed }) => [
                    styles.flagButton,
                    isActive && styles.flagButtonActive,
                    pressed && styles.flagButtonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={tr(option.labelKey, {
                    defaultValue: option.key === "pl" ? fallback.polish : fallback.english,
                  })}
                  accessibilityState={{ selected: isActive }}
                  onPress={() => onSelectLanguage(option.key)}
                >
                  <Image source={source} style={styles.flagImage} />
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
