import { OnboardingIntroLayout } from "@/src/components/onboarding/OnboardingIntroLayout";
import { useSettings } from "@/src/contexts/SettingsContext";
import { setOnboardingCheckpoint } from "@/src/services/onboardingCheckpoint";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

const LEITNER_SOURCE = require("@/assets/illustrations/leitner.png");

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
      debugLabel="leitner"
    >
      <View style={styles.diagram} testID="leitner-diagram">
        <Image source={LEITNER_SOURCE} style={styles.image} resizeMode="contain" />
      </View>
    </OnboardingIntroLayout>
  );
}

const styles = StyleSheet.create({
  diagram: {
    width: "80%",
    aspectRatio: 393 / 293,
    alignSelf: "center",
    marginTop: 18,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
