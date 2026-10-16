import type { AudioLanguage, CourseAudioSettings, FlashcardAutoplayMode } from "./types";

export const FLASHCARD_AUTOPLAY_MODES: FlashcardAutoplayMode[] = ["non_native", "all", "off"];

export function isFlashcardAutoplayMode(value: unknown): value is FlashcardAutoplayMode {
  return FLASHCARD_AUTOPLAY_MODES.some((mode) => mode === value);
}

export function normalizeFlashcardAutoplayMode(value: unknown): FlashcardAutoplayMode {
  return isFlashcardAutoplayMode(value) ? value : "non_native";
}

export function allowsAutomaticAudio(
  mode: FlashcardAutoplayMode,
  language: string | null | undefined,
  nativeLanguage: string,
): boolean {
  if (!language || mode === "off") return false;
  const baseLanguage = (locale: string) => locale.toLowerCase().split(/[-_]/)[0];
  return mode === "all" || baseLanguage(language) !== baseLanguage(nativeLanguage);
}

export const COURSE_AUDIO_STORAGE_KEY = "flashcards.courseAudioOverrides";
export const AUDIO_LANGUAGES: AudioLanguage[] = ["pl-PL", "en-US", "es-ES", "fr-FR"];
export const DEFAULT_COURSE_AUDIO_SETTINGS: CourseAudioSettings = {
  enabled: false,
  frontLanguage: null,
  backLanguage: null,
};

function isAudioLanguage(value: unknown): value is AudioLanguage {
  return AUDIO_LANGUAGES.some((locale) => locale === value);
}

export function normalizeCourseAudioSettings(
  value: Partial<CourseAudioSettings> | null | undefined,
): CourseAudioSettings {
  return {
    ...(isFlashcardAutoplayMode(value?.autoplayMode)
      ? { autoplayMode: value.autoplayMode } : {}),
    enabled: value?.enabled === true,
    frontLanguage: isAudioLanguage(value?.frontLanguage) ? value.frontLanguage : null,
    backLanguage: isAudioLanguage(value?.backLanguage) ? value.backLanguage : null,
  };
}

export function audioLocale(code: string | null | undefined): AudioLanguage | null {
  return AUDIO_LANGUAGES.find((locale) => locale.split("-")[0] === code?.toLowerCase()) ?? null;
}
