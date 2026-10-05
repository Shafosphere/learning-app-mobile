import MyButton from "@/src/components/button/button";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import React, { useState, type ReactNode } from "react";
import {
  Image,
  ScrollView,
  Text,
  type ImageSourcePropType,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getIntroIllustrationWidth, getIntroSpacing } from "./introLayoutSizing";

const WELCOME_LOGO_SOURCE = require("@/assets/illustrations/mascot-box/branding/logo.png");
const SCROLL_BOTTOM_PADDING = 12;

type OnboardingIntroLayoutProps = {
  title: string;
  description: string;
  buttonText: string;
  onContinue: () => void;
  isSaving: boolean;
  descriptionTestID?: string;
  descriptionEndNote?: string;
  children?: ReactNode;
  illustration?: {
    source: ImageSourcePropType;
    aspectRatio: number;
    testID?: string;
  };
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
  illustration,
}: OnboardingIntroLayoutProps) {
  const styles = useStyles();
  const [contentHeight, setContentHeight] = useState(0);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [bodyHeight, setBodyHeight] = useState<number | null>(null);
  const spacing = getIntroSpacing(contentHeight);
  const illustrationWidth = illustration && viewport.width > 0 && bodyHeight !== null
    ? getIntroIllustrationWidth({
        contentWidth: viewport.width,
        availableHeight: viewport.height - bodyHeight - spacing.illustrationGap - SCROLL_BOTTOM_PADDING,
        aspectRatio: illustration.aspectRatio,
      })
    : undefined;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom", "left", "right"]}>
      <View
        style={styles.content}
        testID="onboarding-intro-content"
        onLayout={({ nativeEvent }) => setContentHeight(nativeEvent.layout.height)}
      >
        <ScrollView
          testID="onboarding-intro-scroll"
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
          onLayout={({ nativeEvent }) => {
            const { width, height } = nativeEvent.layout;
            setViewport((previous) => previous.width === width && previous.height === height
              ? previous
              : { width, height });
          }}
        >
          {/* This measurement excludes the illustration, avoiding a sizing feedback loop. */}
          <View
            testID="onboarding-intro-body"
            style={styles.body}
            onLayout={({ nativeEvent }) => setBodyHeight(nativeEvent.layout.height)}
          >
            <View style={[styles.header, { paddingBottom: spacing.headerGap }]}>
              <Image
                source={WELCOME_LOGO_SOURCE}
                testID="onboarding-intro-logo"
                style={{
                  width: spacing.logoWidth,
                  height: spacing.logoWidth * 555 / 523,
                  marginBottom: spacing.logoGap,
                }}
                resizeMode="contain"
                accessible={false}
              />
              <Text style={styles.title} allowFontScaling accessibilityRole="header">
                {title}
              </Text>
            </View>
            <View
              style={[styles.message, { paddingVertical: spacing.cardPadding }]}
              testID="onboarding-intro-message"
            >
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
          </View>
          {illustration ? (
            <View
              testID={illustration.testID}
              style={[
                styles.illustration,
                {
                  width: illustrationWidth ?? "80%",
                  aspectRatio: illustration.aspectRatio,
                  marginTop: spacing.illustrationGap,
                },
              ]}
            >
              <Image source={illustration.source} style={styles.image} resizeMode="contain" accessible={false} />
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.footer} testID="onboarding-intro-footer">
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
  body: {
    flexShrink: 0,
  },
  header: {
    width: "100%",
    alignItems: "center",
    paddingTop: 4,
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
    paddingBottom: SCROLL_BOTTOM_PADDING,
  },
  message: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: colors.secondBackground,
    paddingHorizontal: 20,
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
  illustration: {
    alignSelf: "center",
    flexShrink: 0,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  footer: {
    width: "100%",
    flexShrink: 0,
    paddingTop: 12,
    paddingBottom: 8,
  },
  button: {
    minHeight: 56,
    borderRadius: 16,
  },
  buttonText: {
    fontSize: 20,
    textTransform: "none",
  },
}));
