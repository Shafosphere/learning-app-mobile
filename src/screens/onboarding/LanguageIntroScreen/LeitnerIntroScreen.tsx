import { OnboardingIntroLayout } from "@/src/components/onboarding/OnboardingIntroLayout";
import { useSettings } from "@/src/contexts/SettingsContext";
import { setOnboardingCheckpoint } from "@/src/services/onboardingCheckpoint";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

const LEITNER_SOURCE = require("@/assets/ui/onboarding/leitner.png");

export default function LeitnerIntroScreen() {
  const { uiLanguage } = useSettings();
  const { t } = useTranslation();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const onContinue = async () => {
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
    <OnboardingIntroLayout
      headerGraphic={(width) => (
        <View style={{ width, height: width * 122 / 115, alignItems: "center", justifyContent: "center" }}>
          <View style={{ transform: [{ scale: width / 115 }] }}>
            <BoxSkin wordCount={0} face="happy" cardVariant="logo" showFace accessible={false} />
          </View>
        </View>
      )}
      title={t("onboarding.leitner.title", {
        lng: uiLanguage,
        defaultValue: uiLanguage === "pl" ? "Zapamiętuj więcej" : "Remember more",
      })}
      description={t("onboarding.leitner.description", {
        lng: uiLanguage,
        defaultValue: uiLanguage === "pl"
          ? "Memicard oparty jest na systemie Leitnera.\n\nTrudne fiszki wracają częściej. Te, które znasz — coraz rzadziej. Wszystko dzięki prostemu systemowi pudełek."
          : "Memicard is based on the Leitner system.\n\nDifficult flashcards return more often. Those you know — less and less. All thanks to a simple box system.",
      })}
      buttonText={t("onboarding.leitner.next", {
        lng: uiLanguage,
        defaultValue: uiLanguage === "pl" ? "Zaczynajmy" : "Let's start",
      })}
      onContinue={onContinue}
      isSaving={isSaving}
      descriptionTestID="leitner-intro-description"
      illustration={{
        source: LEITNER_SOURCE,
        aspectRatio: 1179 / 879,
        testID: "leitner-diagram",
      }}
    />
  );
}
import BoxSkin from "@/src/components/Box/Skin/BoxSkin";
