import { memo, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Feather from "@expo/vector-icons/Feather";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useThemeSettings } from "@/src/contexts/SettingsContext";
import { profileCourseActivation } from "@/src/components/course/CourseActivationProfiler";
import { recordCourseActivationEvent } from "@/src/services/courseActivationDiagnostics";
import { getCourseImagePacks, getImagePack } from "./catalog";
import { usesImagePAD } from "./images";
import { subscribePackDownloads } from "./packDownloads";
import { cancelCourse, confirmCourseDownload, downloadCourse, getCourseDownload, refreshCourse } from "./courseDownloads";
import { useCourseImageRevealTarget } from "./CourseImageRevealCoordinator";

// Ignore intrinsic measurement jitter within half a React Native layout unit.
const CONTENT_HEIGHT_TOLERANCE = 0.5;

export const CourseImageDownloadRow = memo(function CourseImageDownloadRow({ slug, courseName, expanded = true, variant = "inline" }: { variant?: "inline" | "standalone"; slug: string | null | undefined; courseName: string; expanded?: boolean }) {
  const supported = (usesImagePAD || __DEV__) && Boolean(getCourseImagePacks(slug).length);
  return supported ? <CourseRow key={slug} slug={slug!} courseName={courseName} expanded={expanded} variant={variant} /> : null;
});

function CourseRow({ slug, courseName, expanded, variant }: { slug: string; courseName: string; expanded: boolean; variant: "inline" | "standalone" }) {
  const { t } = useTranslation();
  const { colors, theme, highContrastEnabled } = useThemeSettings();
  const panelColor = highContrastEnabled ? colors.secondBackground : theme === "dark" ? "#143E43" : "#D5F8F2";
  const buttonTextColor = highContrastEnabled && theme === "light" ? colors.lightbg : colors.font;
  const [contentHeight, setContentHeight] = useState(0);
  const handleLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    const height = nativeEvent.layout.height;
    recordCourseActivationEvent("panel.layout", { slug, height });
    setContentHeight(previousHeight =>
      Math.abs(height - previousHeight) <= CONTENT_HEIGHT_TOLERANCE ? previousHeight : height
    );
  }, [slug]);
  const revealedHeight = useSharedValue(0);
  const targetHeight = expanded ? contentHeight : 0;
  useCourseImageRevealTarget(revealedHeight, targetHeight, slug);
  const revealStyle = useAnimatedStyle(() => ({
    height: revealedHeight.value,
    marginTop: -Math.min(15, revealedHeight.value),
  }));
  const getSnapshot = useCallback(() => getCourseDownload(slug), [slug]);
  const state = useSyncExternalStore(subscribePackDownloads, getSnapshot);
  useEffect(() => { void refreshCourse(slug); }, [slug]);
  useEffect(() => {
    recordCourseActivationEvent("panel.state", { slug, expanded, phase: state.phase });
  }, [slug, expanded, state.phase]);
  const busy = ["pending", "downloading", "transferring"].includes(state.phase);
  const checking = state.phase === "checking" || state.confirmationPending;
  const percent = state.totalBytes > 0 ? Math.min(100, Math.floor(state.downloadedBytes / state.totalBytes * 100)) : 0;
  const size = state.totalBytes > 0 ? t("audioDownload.size", { value: (state.totalBytes / 1_000_000).toFixed(2) }) : null;
  const errorKey = state.errorCode === -10 ? "noSpace" : state.errorCode === -6 ? "networkError" : "failed";
  const status = state.phase === "failed" ? errorKey : state.phase === "confirmation"
    ? state.confirmationReason === "wifi" ? "waitingForWifi" : "playConfirmation"
    : state.phase;
  const button = state.phase === "confirmation" ? state.confirmationReason === "wifi" ? "confirmTransfer" : "confirm"
    : busy ? "cancel" : state.phase === "failed" || state.phase === "cancelled" ? "retry" : "download";
  const showButton = !["ready", "unavailable", "checking"].includes(state.phase);
  const ready = state.phase === "ready";
  const showStatus = state.phase !== "missing" && !ready;
  const action = () => {
    if (checking) return;
    if (busy) void cancelCourse(slug);
    else if (state.phase === "confirmation") void confirmCourseDownload(slug);
    else void downloadCourse(slug);
  };
  const standalone = variant === "standalone";
  const Container = standalone ? View : Animated.View;
  return profileCourseActivation(`panel:${slug}`, (
    <Container
      style={standalone ? styles.standalone : [styles.reveal, { backgroundColor: panelColor }, revealStyle]}
      pointerEvents={expanded ? "auto" : "none"}
      accessibilityElementsHidden={!expanded}
      importantForAccessibility={expanded ? "auto" : "no-hide-descendants"}
    >
    <View
      style={[styles.row, standalone && styles.standaloneRow]}
      testID={`course-image-row-${slug}`}
      onLayout={standalone ? undefined : handleLayout}
    >
      {!standalone ? <View style={styles.details}>
        <View style={styles.icon} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <FontAwesome6 name="image" size={18} color={colors.headline} />
        </View>
        <Text style={[styles.title, { color: colors.headline }]}>
          {t(getCourseImagePacks(slug).length === 1 ? getImagePack(getCourseImagePacks(slug)[0])?.titleKey ?? "contentDownload.title" : "contentDownload.title")}{size ? ` · ${size}` : ""}
        </Text>
      </View> : null}
      {ready ? <View style={[styles.ready, standalone && styles.standaloneReady, { backgroundColor: standalone ? "transparent" : colors.my_green }]}>
        <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Feather name="check" size={19} color={standalone ? colors.headline : buttonTextColor} />
        </View>
        <Text accessibilityLiveRegion="polite" style={[styles.buttonText, { color: standalone ? colors.headline : buttonTextColor }]}>{t("audioDownload.downloaded")}</Text>
      </View> : null}
      {checking && !showButton ? <ActivityIndicator size="small" color={colors.headline} /> : null}
      {showButton ? <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("audioDownload.courseAction", { action: t(`audioDownload.${button}`), course: courseName })}
        accessibilityState={{ disabled: checking }}
        disabled={checking}
        onPress={(event) => { event?.stopPropagation(); action(); }}
        style={({ pressed }) => [styles.button, standalone && styles.standaloneButton, { backgroundColor: colors.my_yellow, opacity: checking || pressed ? 0.65 : 1 }]}
      >
        {checking ? <ActivityIndicator size="small" color={buttonTextColor} /> : button === "download" ? (
          <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Feather name="download" size={20} color={buttonTextColor} />
          </View>
        ) : null}
        <Text style={[styles.buttonText, { color: buttonTextColor }]}>
          {t(`audioDownload.${button}`)}
        </Text>
      </Pressable> : null}
      {__DEV__ && !usesImagePAD && !standalone ? <Text style={[styles.status, standalone && styles.standaloneStatus, { color: colors.paragraph }]}>{t("contentDownload.preview")}</Text> : null}
      {showStatus ? <Text accessibilityLiveRegion="polite" style={[styles.status, standalone && styles.standaloneStatus, { color: colors.paragraph }]}>
        {t(`${status === "failed" || status === "noSpace" ? "contentDownload" : "audioDownload"}.${status}`, { percent })}
      </Text> : null}
      {busy ? <View style={[styles.progressTrack, { backgroundColor: colors.secondBackground }]} accessible={false}>
        <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: standalone ? "transparent" : colors.my_green }]} />
      </View> : null}
    </View>
    </Container>
  ));
}

const styles = StyleSheet.create({
  standalone: { width: "100%" },
  standaloneRow: { position: "relative", paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, gap: 16 },
  standaloneButton: { width: "100%", minHeight: 54, borderRadius: 18 },
  standaloneStatus: { textAlign: "center" },
  standaloneReady: { width: "100%", justifyContent: "center", backgroundColor: "transparent" },
  // Measure content independently so revealing it never squeezes text or jumps.
  reveal: { overflow: "hidden", borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  row: { position: "absolute", top: 0, left: 0, right: 0, paddingTop: 23, paddingBottom: 8, paddingHorizontal: 14, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 },
  details: { flexDirection: "row", alignItems: "center", flexGrow: 1, flexShrink: 1, flexBasis: 125, gap: 8 },
  icon: { width: 20, alignItems: "center" },
  title: { fontSize: 13, fontWeight: "600", flexShrink: 1 },
  status: { width: "100%", fontSize: 12, lineHeight: 17 },
  button: { paddingHorizontal: 18, paddingVertical: 10, minHeight: 44, maxWidth: "100%", borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, flexShrink: 1 },
  buttonText: { fontSize: 15, lineHeight: 22, fontWeight: "700", flexShrink: 1 },
  ready: { paddingHorizontal: 18, paddingVertical: 10, minHeight: 44, maxWidth: "100%", borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 9 },
  progressTrack: { width: "100%", height: 3, borderRadius: 2, overflow: "hidden", marginTop: 5 },
  progressFill: { height: "100%", borderRadius: 2 },
});
