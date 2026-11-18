import { audioLanguageKey } from "../language";
import { memo, useCallback, useEffect, useSyncExternalStore } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import Svg, { Path, Rect } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { getAudioPack, getCourseAudioPacks } from "./catalog";
import { cancelPack, confirmPackDownload, downloadPack, getPackDownload, refreshPack, subscribePackDownloads } from "./packDownloads";

export function CourseAudioDownloadPanels({ slug }: { slug?: string | null }) {
  return <>{getCourseAudioPacks(slug).map(packName => <LanguageAudioDownloadPanel key={packName} packName={packName} />)}</>;
}

export const LanguageAudioDownloadPanel = memo(function LanguageAudioDownloadPanel({ packName }: { packName: string }) {
  const pack = getAudioPack(packName);
  return pack ? <DownloadPanel packName={packName} language={pack.language} /> : null;
});

function DownloadPanel({ packName, language }: { packName: string; language: string }) {
  const { t, i18n } = useTranslation();
  const styles = useStyles();
  const getSnapshot = useCallback(() => getPackDownload(packName), [packName]);
  const state = useSyncExternalStore(subscribePackDownloads, getSnapshot);
  useEffect(() => { void refreshPack(packName); }, [packName]);
  const translatedLanguages = t("courseAudio.languages", { returnObjects: true });
  const translatedName = translatedLanguages && typeof translatedLanguages === "object"
    ? Object.entries(translatedLanguages).find(([locale]) => audioLanguageKey(locale) === language)?.[1] : undefined;
  let languageName = typeof translatedName === "string" ? translatedName : language.toUpperCase();
  if (!translatedName) {
    try {
      languageName = new Intl.DisplayNames([i18n.resolvedLanguage || i18n.language || "en"], { type: "language" }).of(language) || languageName;
    } catch { /* Older runtimes can still show the language code. */ }
  }
  const busy = ["pending", "downloading", "transferring"].includes(state.phase);
  const checking = state.phase === "checking" || state.confirmationPending;
  const ready = state.phase === "ready";
  const percent = state.totalBytes > 0 ? Math.min(100, Math.floor(state.downloadedBytes / state.totalBytes * 100)) : 0;
  const button = state.phase === "confirmation" ? state.confirmationReason === "wifi" ? "confirmTransfer" : "confirm"
    : busy ? "cancel" : ["failed", "cancelled"].includes(state.phase) ? "retry" : "download";
  const status = state.phase === "failed" ? state.errorCode === -10 ? "noSpace" : state.errorCode === -6 ? "networkError" : "failed"
    : state.phase === "confirmation" ? state.confirmationReason === "wifi" ? "waitingForWifi" : "playConfirmation" : state.phase;
  const showButton = !["ready", "unavailable", "checking"].includes(state.phase);
  const action = () => {
    if (checking) return;
    if (busy) void cancelPack(packName);
    else if (state.phase === "confirmation") void confirmPackDownload(packName);
    else void downloadPack(packName);
  };
  const showStatus = !["missing", "ready"].includes(state.phase);
  const actionIcon = busy ? "x" : state.phase === "confirmation" ? "check" : button === "retry" ? "rotate-cw" : "download";
  return <View style={styles.panel} testID={`language-audio-panel-${packName}`}>
    <View style={styles.header}>
      <View style={styles.icon} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.iconTint} />
        <Svg width={38} height={38} viewBox="0 0 48 48">
          <Path d="M10 29v-7a14 14 0 0 1 28 0v7" fill="none" stroke={styles.title.color} strokeWidth={3.5} strokeLinecap="round" />
          <Rect x={7} y={24} width={8} height={17} rx={4} fill={styles.title.color} />
          <Rect x={33} y={24} width={8} height={17} rx={4} fill={styles.title.color} />
          <Rect x={12} y={23} width={6} height={19} rx={3} fill={styles.accent.color} />
          <Rect x={30} y={23} width={6} height={19} rx={3} fill={styles.accent.color} />
        </Svg>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{t("audioDownload.languageTitle", { language: languageName })}</Text>
        <Text style={styles.description}>{t("audioDownload.allCourses")}</Text>
      </View>
    </View>
    <View style={styles.divider} />
    <View style={styles.footer}>
      {state.totalBytes > 0 ? <View style={styles.sizeRow}>
        <Feather name="file-text" size={18} color={styles.size.color} accessible={false} />
        <Text style={styles.size}>{t("audioDownload.size", { value: (state.totalBytes / 1_000_000).toFixed(2) })}</Text>
      </View> : null}
      {ready ? <View style={styles.ready}>
        <Feather name="check" size={19} color={styles.buttonText.color} accessible={false} />
        <Text accessibilityLiveRegion="polite" style={styles.buttonText}>{t("audioDownload.downloaded")}</Text>
      </View> : checking && !showButton ? <ActivityIndicator color={styles.title.color} /> : null}
      {showButton ? <Pressable accessibilityRole="button" accessibilityLabel={t("audioDownload.languageAction", { action: t(`audioDownload.${button}`), language: languageName })}
        accessibilityState={{ disabled: checking }} disabled={checking}
        onPress={event => { event?.stopPropagation(); action(); }}
        style={({ pressed }) => [styles.button, (pressed || checking) && styles.dimmed]}>
        {checking ? <ActivityIndicator color={styles.buttonText.color} size="small" />
          : <Feather name={actionIcon} size={20} color={styles.buttonText.color} accessible={false} />}
        <Text style={styles.buttonText}>{t(`audioDownload.${button}`)}</Text>
      </Pressable> : null}

    </View>
    {showStatus ? <Text accessibilityLiveRegion="polite" style={styles.status}>
      {t(`audioDownload.${status}`, { percent })}
    </Text> : null}
    {busy ? <View style={styles.progressTrack} accessible accessibilityRole="progressbar" accessibilityLabel={t("audioDownload.languageTitle", { language: languageName })}
      accessibilityValue={{ min: 0, max: 100, now: percent }}>
      <View style={[styles.progressFill, { width: `${percent}%` }]} />
    </View> : null}
  </View>;
}

// Compare the theme's light/dark text against each accent, including accessibility palettes.
function luminance(hex: string) {
  const channels = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
const useStyles = createThemeStylesHook((colors) => {
  const value = luminance(colors.my_green) + 0.05;
  const buttonForeground = value / (luminance(colors.darkbg) + 0.05) >= (luminance(colors.lightbg) + 0.05) / value ? colors.darkbg : colors.lightbg;
  return {
    panel: {
      borderRadius: 15,
      backgroundColor: colors.secondBackground, padding: 16, marginBottom: 14,
    },
    header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    icon: { width: 50, height: 50, borderRadius: 15, overflow: "hidden", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    iconTint: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: colors.my_green, opacity: 0.12 },
    accent: { color: colors.my_green },
    copy: { flex: 1, minWidth: 0, gap: 4 },
    title: { fontSize: 18, lineHeight: 24, fontWeight: "800", color: colors.headline },
    description: { fontSize: 14, lineHeight: 20, color: colors.paragraph },
    divider: { height: 1, backgroundColor: colors.border, marginTop: 16, marginBottom: 12 },
    footer: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 10 },
    button: { minHeight: 44, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.my_green, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, maxWidth: "100%", flexShrink: 1 },
    buttonText: { fontSize: 15, lineHeight: 22, fontWeight: "700", color: buttonForeground, flexShrink: 1 },
    ready: { minHeight: 44, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.my_green, flexDirection: "row", alignItems: "center", gap: 9, maxWidth: "100%" },
    sizeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginRight: "auto", flexShrink: 0 },
    size: { fontSize: 14, lineHeight: 20, color: colors.paragraph },
    dimmed: { opacity: 0.65 },
    status: { fontSize: 12, lineHeight: 18, color: colors.paragraph, marginTop: 10 },
    progressTrack: { height: 3, borderRadius: 2, marginTop: 8, backgroundColor: colors.background, overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: colors.my_green },
  };
});
