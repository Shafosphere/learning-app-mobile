import type { ImageSourcePropType } from "react-native";

import PL_FLAG from "@/assets/flags/PL.png";
import PL_FLAG_GRAY from "@/assets/flags/PLgray.png";
import ES_FLAG from "@/assets/flags/ES.png";
import ES_FLAG_GRAY from "@/assets/flags/ESgray.png";
import PM_FLAG from "@/assets/flags/PM.png";
import PM_FLAG_GRAY from "@/assets/flags/PMgray.png";
import US_FLAG from "@/assets/flags/US.png";
import US_FLAG_GRAY from "@/assets/flags/USgray.png";

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
  pm: {
    active: PM_FLAG,
    inactive: PM_FLAG_GRAY,
  },
  en: {
    active: US_FLAG,
    inactive: US_FLAG_GRAY,
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
  const entry = languageFlags[code as keyof typeof languageFlags];
  if (!entry) {
    return undefined;
  }

  if (variant === "inactive") {
    return entry.inactive ?? entry.active;
  }

  return entry.active;
}
