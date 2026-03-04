import type { ImageSourcePropType } from "react-native";

import PL_FLAG from "@/assets/flags/language/pl/active.png";
import PL_FLAG_GRAY from "@/assets/flags/language/pl/inactive.png";
import ES_FLAG from "@/assets/flags/language/es/active.png";
import ES_FLAG_GRAY from "@/assets/flags/language/es/inactive.png";
import FR_FLAG from "@/assets/flags/language/fr/active.png";
import FR_FLAG_GRAY from "@/assets/flags/language/fr/inactive.png";
import US_FLAG from "@/assets/flags/language/en-us/active.png";
import US_FLAG_GRAY from "@/assets/flags/language/en-us/inactive.png";
import KR_FLAG from "@/assets/flags/language/ko/active.png";

export type FlagVariant = "active" | "inactive";

export type LanguageFlagSources = {
  active: ImageSourcePropType;
  inactive?: ImageSourcePropType;
};

export const languageFlags = {
  pl: {
    active: PL_FLAG,
    inactive: PL_FLAG_GRAY,
  },
  es: {
    active: ES_FLAG,
    inactive: ES_FLAG_GRAY,
  },
  fr: {
    active: FR_FLAG,
    inactive: FR_FLAG_GRAY,
  },
  pm: {
    active: FR_FLAG,
    inactive: FR_FLAG_GRAY,
  },
  en: {
    active: US_FLAG,
    inactive: US_FLAG_GRAY,
  },
  kr: {
    active: KR_FLAG,
  },
} as const satisfies Record<string, LanguageFlagSources>;

export type LanguageCode = keyof typeof languageFlags;

export const supportedLanguageCodes = Object.keys(
  languageFlags
) as LanguageCode[];

export function getFlagSource(
  code: string,
  variant: FlagVariant = "active"
): ImageSourcePropType | undefined {
  const entry: LanguageFlagSources | undefined =
    languageFlags[code as keyof typeof languageFlags];
  if (!entry) {
    return undefined;
  }

  if (variant === "inactive") {
    return entry.inactive ?? entry.active;
  }

  return entry.active;
}
