import { OnboardingIntroLayout } from "@/src/components/onboarding/OnboardingIntroLayout";
import { useSettings } from "@/src/contexts/SettingsContext";
import { setOnboardingCheckpoint } from "@/src/services/onboardingCheckpoint";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

type BetaIntroScreenProps = {
  onComplete: () => void;
};

/**
 * Keeps a short heading on two visually balanced lines without encoding a
 * line break in every translation. It only breaks at a word boundary, so a
 * locale can freely change its word order.
 */
export function balanceTitleIntoTwoLines(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);

  if (words.length < 2) return title;

  const totalLength = words.join(" ").length;
  let firstLine = words[0];
  let bestSplit = 1;
  let smallestDifference = Math.abs(totalLength - 2 * firstLine.length);

  for (let splitAt = 1; splitAt < words.length; splitAt += 1) {
    if (splitAt > 1) firstLine += ` ${words[splitAt - 1]}`;

    const difference = Math.abs(totalLength - 2 * firstLine.length);
    if (difference < smallestDifference) {
      smallestDifference = difference;
      bestSplit = splitAt;
    }
  }

  return `${words.slice(0, bestSplit).join(" ")}\n${words.slice(bestSplit).join(" ")}`;
}

export default function BetaIntroScreen({ onComplete }: BetaIntroScreenProps) {
  const { uiLanguage } = useSettings();
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);

  const onContinue = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await setOnboardingCheckpoint("leitner_required");
      onComplete();
    } finally {
      setIsSaving(false);
    }
  };

  const title = t("onboarding.beta.title", {
    lng: uiLanguage,
    defaultValue: uiLanguage === "pl" ? "Tworzysz Memicard razem ze mną" : "You are building Memicard with me",
  });

  return (
    <OnboardingIntroLayout
      title={balanceTitleIntoTwoLines(title)}
      description={t("onboarding.beta.description", {
        lng: uiLanguage,
        defaultValue: uiLanguage === "pl"
          ? "Aplikacja jest na początku swojej drogi. Możesz trafić na niedopracowane miejsca — jeśli coś nie działa albo masz pomysł, koniecznie daj znać."
          : "The app is still in beta. You may come across unfinished areas — if something does not work or you have an idea, please let me know.",
      })}
      descriptionEndNote={t("onboarding.beta.thanks", {
        lng: uiLanguage,
        defaultValue: uiLanguage === "pl" ? "Dziękuję" : "Thank you",
      })}
      buttonText={t("onboarding.beta.next", {
        lng: uiLanguage,
        defaultValue: uiLanguage === "pl" ? "Zaczynajmy" : "Let's start",
      })}
      onContinue={onContinue}
      isSaving={isSaving}
      descriptionTestID="beta-description"
      debugLabel="beta"
    />
  );
}
