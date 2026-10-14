import { useCallback, useEffect, useState } from "react";
import { Alert, AppState } from "react-native";
import { useTranslation } from "react-i18next";
import { getCustomCourseById } from "@/src/db/sqlite/repositories/courses";
import { getAudioCourse, resolveRecording, type AudioSide } from "./catalog";
import { flashcardAudioPlayer } from "./playback";

export function useFlashcardAudio(courseId: number | null | undefined, externalId: string | null | undefined,
  contextKey: string, enabled: boolean) {
  const { t } = useTranslation();
  const [course, setCourse] = useState<{ id: number; slug: string | null } | null>(null);
  useEffect(() => {
    if (courseId == null) return;
    let cancelled = false;
    void getCustomCourseById(courseId).then((record) => {
      if (!cancelled) setCourse({ id: courseId, slug: record?.slug ?? null });
    }).catch(() => { if (!cancelled) setCourse({ id: courseId, slug: null }); });
    return () => { cancelled = true; };
  }, [courseId]);
  const slug = course?.id === courseId ? course?.slug ?? null : null;
  const available = enabled && Boolean(getAudioCourse(slug));
  useEffect(() => {
    void flashcardAudioPlayer.stop();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") void flashcardAudioPlayer.stop();
    });
    return () => { subscription.remove(); void flashcardAudioPlayer.stop(); };
  }, [courseId, contextKey, enabled]);
  const read = useCallback((side: AudioSide, text: string) => {
    if (!available || !text.trim()) return;
    const resolved = resolveRecording(slug, externalId, side, text);
    if (!resolved) return;
    void flashcardAudioPlayer.play({ ...resolved, text,
      onError: () => Alert.alert(t("app.status.error"), t("flashcards.card.speechError")) });
  }, [available, externalId, slug, t]);
  return { available, read };
}
