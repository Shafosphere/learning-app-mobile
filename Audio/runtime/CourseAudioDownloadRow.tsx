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
import { getAudioCourse } from "./catalog";
import { subscribePackDownloads } from "./packDownloads";
import { cancelCourse, confirmCourseDownload, downloadCourse, getCourseDownload, refreshCourse } from "./courseDownloads";
import { useCourseAudioRevealTarget } from "./CourseAudioRevealCoordinator";

// Ignore intrinsic measurement jitter within half a React Native layout unit.
const CONTENT_HEIGHT_TOLERANCE = 0.5;

export const CourseAudioDownloadRow = memo(function CourseAudioDownloadRow({ slug, courseName, expanded = true }: { slug: string | null | undefined; courseName: string; expanded?: boolean }) {
  const supported = Boolean(getAudioCourse(slug)?.requiredPacks.length);
  return supported ? <CourseRow key={slug} slug={slug!} courseName={courseName} expanded={expanded} /> : null;
});

function CourseRow({ slug, courseName, expanded }: { slug: string; courseName: string; expanded: boolean }) {
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
  useCourseAudioRevealTarget(revealedHeight, targetHeight, slug);
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
  return profileCourseActivation(`panel:${slug}`, (
    <Animated.View
      style={[styles.reveal, { backgroundColor: panelColor }, revealStyle]}
      pointerEvents={expanded ? "auto" : "none"}
      accessibilityElementsHidden={!expanded}
      importantForAccessibility={expanded ? "auto" : "no-hide-descendants"}
    >
    <View
      style={styles.row}
      testID={`course-audio-row-${slug}`}
      onLayout={handleLayout}
    >
      <View style={styles.details}>
        <View style={styles.icon} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <FontAwesome6 name="headphones" size={18} color={colors.headline} />
        </View>
        <Text style={[styles.title, { color: colors.headline }]}>
          {t("audioDownload.title")}{size ? ` · ${size}` : ""}
        </Text>
      </View>
      {ready ? <View style={[styles.ready, { backgroundColor: colors.my_green }]}>
        <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <FontAwesome6 name="check" size={14} color={buttonTextColor} />
        </View>
        <Text accessibilityLiveRegion="polite" style={[styles.buttonText, { color: buttonTextColor }]}>{t("audioDownload.downloaded")}</Text>
      </View> : null}
      {checking && !showButton ? <ActivityIndicator size="small" color={colors.headline} /> : null}
      {showButton ? <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("audioDownload.courseAction", { action: t(`audioDownload.${button}`), course: courseName })}
        accessibilityState={{ disabled: checking }}
        disabled={checking}
        onPress={(event) => { event?.stopPropagation(); action(); }}
        style={({ pressed }) => [styles.button, { backgroundColor: colors.my_yellow, opacity: checking ? 0.6 : pressed ? 0.8 : 1 }]}
      >
        {checking ? <ActivityIndicator size="small" color={buttonTextColor} /> : button === "download" ? (
          <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Feather name="download" size={16} color={buttonTextColor} />
          </View>
        ) : null}
        <Text style={[styles.buttonText, { color: buttonTextColor }]}>
          {t(`audioDownload.${button}`)}
        </Text>
      </Pressable> : null}
      {showStatus ? <Text accessibilityLiveRegion="polite" style={[styles.status, { color: colors.paragraph }]}>
        {t(`audioDownload.${status}`, { percent })}
      </Text> : null}
      {busy ? <View style={[styles.progressTrack, { backgroundColor: colors.secondBackground }]} accessible={false}>
        <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: colors.my_green }]} />
      </View> : null}
    </View>
    </Animated.View>
  ));
}

const styles = StyleSheet.create({
  // Measure content independently so revealing it never squeezes text or jumps.
  reveal: { overflow: "hidden", borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  row: { position: "absolute", top: 0, left: 0, right: 0, paddingTop: 23, paddingBottom: 8, paddingHorizontal: 14, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 },
  details: { flexDirection: "row", alignItems: "center", flexGrow: 1, flexShrink: 1, flexBasis: 125, gap: 8 },
  icon: { width: 20, alignItems: "center" },
  title: { fontSize: 13, fontWeight: "600", flexShrink: 1 },
  status: { width: "100%", fontSize: 12, lineHeight: 17 },
  button: { paddingHorizontal: 14, paddingVertical: 12, minHeight: 44, maxWidth: "100%", borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  buttonText: { fontSize: 13, fontWeight: "700", flexShrink: 1 },
  ready: { paddingHorizontal: 14, paddingVertical: 12, minHeight: 44, maxWidth: "100%", borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  progressTrack: { width: "100%", height: 3, borderRadius: 2, overflow: "hidden", marginTop: 5 },
  progressFill: { height: "100%", borderRadius: 2 },
});
