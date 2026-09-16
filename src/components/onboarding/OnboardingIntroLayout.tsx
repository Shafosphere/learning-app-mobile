import MyButton from "@/src/components/button/button";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import React, { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  type LayoutChangeEvent,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const WELCOME_LOGO_SOURCE = require("@/assets/illustrations/mascot-box/branding/logo.png");

type OnboardingIntroLayoutProps = {
  title: string;
  description: string;
  buttonText: string;
  onContinue: () => void;
  isSaving: boolean;
  descriptionTestID?: string;
  descriptionEndNote?: string;
  children?: ReactNode;
  debugLabel?: string;
};

export function OnboardingIntroLayout({
  title,
  description,
  buttonText,
  onContinue,
  isSaving,
  descriptionTestID,
  descriptionEndNote,
  children,
  debugLabel = "intro",
}: OnboardingIntroLayoutProps) {
  const styles = useStyles();
  const mountedAt = useRef(Date.now());
  const [isContentVisible, setIsContentVisible] = useState(Platform.OS === "web");

  useEffect(() => {
    if (Platform.OS === "web") return;
    const timeout = setTimeout(() => setIsContentVisible(true), 50);
    return () => clearTimeout(timeout);
  }, []);

  const log = useCallback(
    (event: string, details?: object) => {
      if (!__DEV__) return;
      console.log(`[OnboardingIntroLayout:${debugLabel}] +${Date.now() - mountedAt.current}ms ${event}`, details ?? "");
    },
    [debugLabel]
  );

  const logLayout = useCallback(
    (name: string) => (event: LayoutChangeEvent) => {
      log(`${name} layout`, event.nativeEvent.layout);
    },
    [log]
  );

  useEffect(() => {
    log("mounted", {
      container: StyleSheet.flatten(styles.container),
      content: StyleSheet.flatten(styles.content),
    });
  }, [log, styles.container, styles.content]);

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "bottom"]}
      onLayout={logLayout("container")}
    >
      <View
        style={[styles.content, !isContentVisible && styles.contentHidden]}
        onLayout={logLayout("content")}
      >
          <View style={styles.header} onLayout={logLayout("header")}>
            <Image source={WELCOME_LOGO_SOURCE} style={styles.logo} resizeMode="contain" />
            <Text
              style={styles.title}
              allowFontScaling
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
            >
              {title}
            </Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.message} testID="onboarding-intro-message">
              <Text testID={descriptionTestID} style={styles.description} allowFontScaling>
                {description}
              </Text>
              {descriptionEndNote ? (
                <Text style={styles.descriptionEndNote} allowFontScaling>
                  {descriptionEndNote}
                </Text>
              ) : null}
            </View>
            {children}
          </ScrollView>

          <View
            style={styles.footer}
            testID="onboarding-intro-footer"
            onLayout={logLayout("footer")}
          >
            <MyButton
              text={buttonText}
              onPress={onContinue}
              disabled={isSaving}
              color="my_green"
              width="100%"
              textStyle={styles.buttonText}
              style={styles.button}
            />
          </View>
      </View>
    </SafeAreaView>
  );
}

const useStyles = createThemeStylesHook((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    paddingHorizontal: 18,
  },
  contentHidden: {
    opacity: 0,
  },
  header: {
    width: "100%",
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 16,
  },
  logo: {
    width: 108,
    height: 114,
    marginBottom: 12,
  },
  title: {
    width: "100%",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    color: colors.headline,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  message: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: colors.secondBackground,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  description: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: "700",
    color: colors.paragraph,
    textAlign: "center",
  },
  descriptionEndNote: {
    marginTop: 12,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: "700",
    color: colors.paragraph,
    textAlign: "right",
  },
  footer: {
    width: "100%",
    paddingTop: 12,
    paddingBottom: 8,
  },
  button: {
    height: 56,
    borderRadius: 16,
  },
  buttonText: {
    fontSize: 20,
    textTransform: "none",
  },
}));
