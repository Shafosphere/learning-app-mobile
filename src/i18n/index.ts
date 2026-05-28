import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { createInstance, type i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/src/locales/en.json";
import pl from "@/src/locales/pl.json";

export type SupportedLanguage = "pl" | "en";
export type UiLanguage = SupportedLanguage;
export type NativeLanguage = SupportedLanguage;

const UI_LANGUAGE_STORAGE_KEY = "uiLanguage";
const LEGAL_CONTROLLER_NAME =
  process.env.EXPO_PUBLIC_LEGAL_CONTROLLER_NAME?.trim() ||
  "[controller full name]";

const resources = {
  pl: { translation: pl },
  en: { translation: en },
} as const;

function normalizeToSupportedLanguage(languageTag: string | null | undefined): SupportedLanguage {
  if (!languageTag) {
    return "pl";
  }

  const normalized = languageTag.toLowerCase();
  if (normalized.startsWith("en")) {
    return "en";
  }
  if (normalized.startsWith("pl")) {
    return "pl";
  }
  return "pl";
}

export function resolveSystemLanguage(): SupportedLanguage {
  const locale = Localization.getLocales()[0];
  return normalizeToSupportedLanguage(locale?.languageTag);
}

export function normalizeUiLanguage(
  value: string | null | undefined
): UiLanguage {
  if (value === "pl" || value === "en") {
    return value;
  }
  // Backward compatibility for previously persisted "system".
  if (value === "system") {
    return resolveSystemLanguage();
  }
  return resolveSystemLanguage();
}

function parseStoredUiLanguage(value: string | null): string | null {
  if (value == null) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "string" ? parsed : value;
  } catch {
    return value;
  }
}

export function normalizeNativeLanguage(
  value: string | null | undefined,
  fallback: NativeLanguage
): NativeLanguage {
  if (value === "pl" || value === "en") {
    return value;
  }
  return fallback;
}

export function resolveLanguage(uiLanguage: UiLanguage): SupportedLanguage {
  return uiLanguage;
}

async function resolveInitialLanguage(): Promise<SupportedLanguage> {
  try {
    const saved = await AsyncStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
    return normalizeUiLanguage(parseStoredUiLanguage(saved));
  } catch {
    return resolveSystemLanguage();
  }
}

let initializationPromise: Promise<typeof i18n> | null = null;
const i18n = createInstance();

function ensureI18nInitialized(): Promise<I18nInstance> {
  if (i18n.isInitialized) {
    return Promise.resolve(i18n);
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      const initialLanguage = await resolveInitialLanguage();
      await i18n
        .use(initReactI18next)
        .init({
          compatibilityJSON: "v4",
          resources,
          lng: initialLanguage,
          fallbackLng: "pl",
          interpolation: {
            escapeValue: false,
            defaultVariables: {
              legalControllerName: LEGAL_CONTROLLER_NAME,
            },
          },
          react: {
            useSuspense: false,
          },
        });
      return i18n;
    })();
  }

  return initializationPromise;
}

void ensureI18nInitialized();

export default i18n;
