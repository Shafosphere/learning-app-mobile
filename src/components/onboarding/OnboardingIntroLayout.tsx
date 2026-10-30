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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getIntroIllustrationWidth, getIntroSpacing } from "./introLayoutSizing";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";

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
  headerGraphic?: (width: number) => ReactNode;
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
  headerGraphic,
  illustration,
}: OnboardingIntroLayoutProps) {
  const styles = useStyles();
  const { orientation, isTabletLayout } = useDeviceLayout();
  const isTabletLandscape = isTabletLayout && orientation === "landscape";
  const insets = useSafeAreaInsets();
  const [contentHeight, setContentHeight] = useState(0);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [measuredBody, setMeasuredBody] = useState<{
    height: number;
    logoWidth: number;
  } | null>(null);
  const spacing = getIntroSpacing(contentHeight);
  const logoWidth = spacing.logoWidth;
  // A body measured with the initial compact spacing cannot size the final illustration.
  const isLayoutReady = contentHeight > 0 && viewport.height > 0 && viewport.width > 0
    && measuredBody?.logoWidth === logoWidth;
  const illustrationWidth = illustration && isLayoutReady
    ? getIntroIllustrationWidth({
        contentWidth: viewport.width,
        availableHeight: viewport.height - measuredBody.height - spacing.illustrationGap - SCROLL_BOTTOM_PADDING,
        aspectRatio: illustration.aspectRatio,
      })
    : undefined;

  if (isTabletLandscape && illustration) {
    return (
      <View
        testID="onboarding-intro-safe-area"
        style={[
          styles.container,
          { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right },
        ]}
      >
        <ScrollView
          testID="onboarding-intro-scroll"
          contentContainerStyle={styles.landscapeScrollContent}
        >
          <View style={styles.landscapePanel}>
            <View style={styles.landscapeCopy} testID="onboarding-intro-body">
              <Text style={styles.landscapeTitle} allowFontScaling accessibilityRole="header">
                {title}
              </Text>
              <View style={styles.landscapeMessage} testID="onboarding-intro-message">
                <Text testID={descriptionTestID} style={styles.landscapeDescription} allowFontScaling>
                  {description}
                </Text>
                {descriptionEndNote ? (
                  <Text style={styles.descriptionEndNote} allowFontScaling>{descriptionEndNote}</Text>
                ) : null}
              </View>
              {children}
              <View style={styles.landscapeAction} testID="onboarding-intro-footer">
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
            <View style={[styles.landscapeDiagram, { aspectRatio: illustration.aspectRatio }]} testID={illustration.testID}>
              <Image
                source={illustration.source}
                style={styles.landscapeImage}
                resizeMode="contain"
                accessible={false}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      testID="onboarding-intro-safe-area"
      style={[
        styles.container,
        // The root provider already has initialWindowMetrics. Apply them in the
        // first render instead of waiting for native SafeAreaView to update padding.
        { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right },
      ]}
    >
      <View
        style={styles.content}
        testID="onboarding-intro-content"
        onLayout={({ nativeEvent }) => setContentHeight(nativeEvent.layout.height)}
      >
        <ScrollView
          testID="onboarding-intro-scroll"
          style={[styles.scroll, { opacity: isLayoutReady ? 1 : 0 }]}
          pointerEvents={isLayoutReady ? "auto" : "none"}
          accessibilityElementsHidden={!isLayoutReady}
          importantForAccessibility={isLayoutReady ? "auto" : "no-hide-descendants"}
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
            onLayout={({ nativeEvent }) => {
              setMeasuredBody({ height: nativeEvent.layout.height, logoWidth });
            }}
          >
            <View style={[styles.header, { paddingBottom: spacing.headerGap }]}>
              {headerGraphic && (
                <View style={{ marginBottom: spacing.logoGap }}>
                  {headerGraphic(logoWidth)}
                </View>
              )}
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
    </View>
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
  landscapeScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  landscapePanel: {
    width: "100%",
    maxWidth: 1000,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 40,
  },
  landscapeCopy: {
    flex: 1,
    minWidth: 0,
    gap: 20,
  },
  landscapeTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    color: colors.headline,
    letterSpacing: -0.6,
  },
  landscapeMessage: {
    gap: 12,
  },
  landscapeDescription: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: "500",
    color: colors.paragraph,
  },
  landscapeAction: {
    width: "100%",
    maxWidth: 240,
    paddingTop: 8,
  },
  landscapeDiagram: {
    flex: 1.15,
    minWidth: 0,
    maxWidth: 460,
  },
  landscapeImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
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
