import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState } from "react-native";
import { useTranslation } from "react-i18next";
import { getCustomCourseById, type CustomCourseRecord } from "@/src/db/sqlite/repositories/courses";
import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { useSettings } from "@/src/contexts/SettingsContext";
import { usePopup } from "@/src/contexts/PopupContext";
import { allowsAutomaticAudio, audioLocale, normalizeFlashcardAutoplayMode } from "@/src/contexts/settings/courseAudioSettings";
import { getAudioCourse, normalizeAudioText, resolveRecording, type AudioSide } from "./catalog";
import { flashcardAudioPlayer } from "./playback";

export const FLASHCARD_AUTOPLAY_DELAY_MS = 500;
type AutoplayPrompt = {
  side: AudioSide;
  text: string;
  cardKey: string;
  phase?: "question" | "answer";
  delayMs?: number;
};

export function useFlashcardAudio(
  courseId: number | null | undefined,
  externalId: string | null | undefined,
  contextKey: string,
  enabled: boolean,
  prompt?: AutoplayPrompt,
) {
  const { t } = useTranslation();
  const popup = usePopup();
  const {
    getCustomCourseAudioSettings,
    courseAudioSettingsHydrated,
    flashcardAudioVolume,
    flashcardAudioVolumeHydrated,
    nativeLanguage,
    nativeLanguageHydrated,
  } = useSettings();
  const [course, setCourse] = useState<{ id: number; record: CustomCourseRecord | null } | null>(null);
  const [appActive, setAppActive] = useState(AppState.currentState == null || AppState.currentState === "active");
  const appActiveRef = useRef(appActive);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReadKey = useRef<string | null>(null);
  const errorShown = useRef(false);
  const playingAudio = useRef<{ automatic: boolean; language: string } | null>(null);
  const cancelTimer = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => {
    errorShown.current = false;
    lastReadKey.current = null;
    if (courseId == null) return;
    let cancelled = false;
    void getCustomCourseById(courseId).then((record) => {
      if (!cancelled) setCourse({ id: courseId, record });
    }).catch(() => { if (!cancelled) setCourse({ id: courseId, record: null }); });
    return () => { cancelled = true; };
  }, [courseId]);

  const record = course?.id === courseId ? course?.record ?? null : null;
  const slug = record?.slug ?? null;
  const settings = courseId != null ? getCustomCourseAudioSettings(courseId) : null;
  const languages = useMemo(() => {
    const catalogCourse = getAudioCourse(slug);
    if (catalogCourse) return { front: catalogCourse.frontLanguage, back: catalogCourse.backLanguage };
    const pack = record?.isOfficial ? OFFICIAL_PACKS.find((entry) => entry.slug === slug) : null;
    return pack ? { front: audioLocale(pack.sourceLang), back: audioLocale(pack.targetLang) }
      : { front: settings?.frontLanguage, back: settings?.backLanguage };
  }, [record?.isOfficial, slug, settings?.frontLanguage, settings?.backLanguage]);
  const available = enabled && appActive && courseAudioSettingsHydrated && flashcardAudioVolumeHydrated && flashcardAudioVolume > 0 && Boolean(record && settings?.enabled && languages.front && languages.back);
  const promptKey = prompt ? JSON.stringify([courseId, prompt.cardKey, prompt.phase ?? "question", prompt.side, normalizeAudioText(prompt.text)]) : null;
  const autoplayDelayMs = prompt?.delayMs ?? FLASHCARD_AUTOPLAY_DELAY_MS;
  const autoplayMode = normalizeFlashcardAutoplayMode(settings?.autoplayMode);
  const autoplayReady = nativeLanguageHydrated;
  const autoplayAllowed = Boolean(
    autoplayReady && prompt &&
    allowsAutomaticAudio(autoplayMode, languages[prompt.side], nativeLanguage)
  );

  useEffect(() => {
    cancelTimer();
    const current = playingAudio.current;
    if (current?.automatic && (
      !autoplayReady || !allowsAutomaticAudio(autoplayMode, current.language, nativeLanguage)
    )) {
      playingAudio.current = null;
      void flashcardAudioPlayer.stop();
    }
  }, [autoplayMode, autoplayReady, nativeLanguage, cancelTimer]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      const active = state === "active";
      appActiveRef.current = active;
      setAppActive(active);
      if (!active) {
        // Returning from background must not replay this presentation.
        lastReadKey.current = promptKey;
        cancelTimer();
        void flashcardAudioPlayer.stop();
      }
    });
    return () => subscription.remove();
  }, [cancelTimer, promptKey]);

  useEffect(() => {
    cancelTimer();
    void flashcardAudioPlayer.stop();
    return () => { cancelTimer(); void flashcardAudioPlayer.stop(); };
  }, [courseId, contextKey, available, cancelTimer]);

  const play = useCallback((side: AudioSide, text: string, automatic: boolean) => {
    if (!available || !appActiveRef.current || !text.trim()) return;
    cancelTimer();
    lastReadKey.current = promptKey;
    const resolved = resolveRecording(slug, externalId, side, text)
      ?? { language: languages[side], recording: null };
    if (!resolved.language) return;
    if (automatic && (
      !autoplayReady || !allowsAutomaticAudio(autoplayMode, resolved.language, nativeLanguage)
    )) return;
    playingAudio.current = { automatic, language: resolved.language };
    void flashcardAudioPlayer.play({ ...resolved, language: resolved.language, text,
      onError: () => {
        if (!automatic) Alert.alert(t("app.status.error"), t("flashcards.card.speechError"));
        else if (!errorShown.current) {
          errorShown.current = true;
          popup({ message: t("flashcards.card.speechError"), color: "disoriented", duration: 3500 });
        }
      },
    });
  }, [available, cancelTimer, externalId, languages, popup, promptKey, slug, t, autoplayMode, autoplayReady, nativeLanguage]);
  const read = useCallback((side: AudioSide, text: string) => play(side, text, false), [play]);

  useEffect(() => {
    if (!available || !autoplayAllowed || !prompt?.text.trim() || lastReadKey.current === promptKey) return;
    if (autoplayDelayMs === 0) {
      play(prompt.side, prompt.text, true);
      return;
    }
    timer.current = setTimeout(() => {
      timer.current = null;
      play(prompt.side, prompt.text, true);
    }, autoplayDelayMs);
    return cancelTimer;
  }, [available, autoplayAllowed, contextKey, promptKey, prompt?.side, prompt?.text, autoplayDelayMs, play, cancelTimer]);

  return { available, read };
}
