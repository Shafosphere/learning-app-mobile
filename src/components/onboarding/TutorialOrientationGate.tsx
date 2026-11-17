import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LogoMessage from "@/src/components/logoMessage/LogoMessage";
import { useTutorialOrientationState } from "@/src/contexts/TutorialOrientationContext";

export function TutorialOrientationGate() {
  const orientation = useTutorialOrientationState();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const bubbleWidth = Math.max(0, Math.min(400, width - 48));
  if (!orientation?.portraitRequired || orientation.ready || !orientation.showNotice) return null;

  return (
    <View testID="tutorial-orientation-gate" accessibilityViewIsModal
      style={styles.overlay}>
      <View style={[styles.message, {
        width: bubbleWidth,
        left: (width - bubbleWidth) / 2,
        top: Math.max(insets.top + 24, (height - 260) / 2),
      }]}>
      <LogoMessage
        mascotFace="nice"
        title={t("tutorialOrientation.title")}
        description={t("tutorialOrientation.description")}
        onNext={orientation.acknowledge}
        canGoNext={orientation.layoutReady}
        canGoPrevious={false}
        previousLabel={t("onboarding.previousMessage")}
        nextLabel={t("tutorialOrientation.continue")}
      />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 1000, elevation: 1000 },
  message: { position: "absolute" },
});
