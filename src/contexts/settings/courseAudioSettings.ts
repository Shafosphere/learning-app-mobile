import type { AudioLanguage, CourseAudioSettings } from "./types";

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
    enabled: value?.enabled === true,
    frontLanguage: isAudioLanguage(value?.frontLanguage) ? value.frontLanguage : null,
    backLanguage: isAudioLanguage(value?.backLanguage) ? value.backLanguage : null,
  };
}

export function audioLocale(code: string | null | undefined): AudioLanguage | null {
  return AUDIO_LANGUAGES.find((locale) => locale.split("-")[0] === code?.toLowerCase()) ?? null;
}
