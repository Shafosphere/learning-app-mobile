import type { CEFRLevel } from "./language";

export interface LanguageCourse {
  sourceLang: string; // 'en'
  targetLang: string; // 'pl'
  sourceLangId?: number; // np. 1
  targetLangId?: number; // np. 2
  level?: CEFRLevel;
}
