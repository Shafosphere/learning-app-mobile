import type { NativeLanguage } from "@/src/i18n";

const POLISH_LANGUAGE_COURSE_SLUGS = [
  "fiszki_podstawy_en_pl_slowa",
  "eng_to_pl_a1",
  "eng_to_pl_a2",
  "eng_to_pl_b1",
  "eng_to_pl_b2",
] as const;

const ENGLISH_LANGUAGE_COURSE_SLUGS = [
  "basic_english_to_spanish_50",
] as const;

const POLISH_GENERAL_COURSE_SLUGS = [
  "astronomia",
  "polska_historia",
  "math",
  "grecka_mitologia_prawda_falsz_50",
  "flagi_europy",
  "flagi_afryki",
  "flagi_azji",
  "flagi_ameryki",
  "flagi_oceanii",
  "flagi_swiata",
  "panstwa_i_stolice_europy",
  "panstwa_i_stolice_afryki",
  "panstwa_i_stolice_azji",
  "panstwa_i_stolice_ameryki",
  "panstwa_i_stolice_oceanii",
  "panstwa_i_stolice_swiata",
] as const;

const ENGLISH_GENERAL_COURSE_SLUGS = [
  "flagi_europy_en",
  "flagi_afryki_en",
  "flagi_azji_en",
  "flagi_ameryki_en",
  "flagi_oceanii_en",
  "flagi_swiata_en",
  "panstwa_i_stolice_europy_en",
  "panstwa_i_stolice_afryki_en",
  "panstwa_i_stolice_azji_en",
  "panstwa_i_stolice_ameryki_en",
  "panstwa_i_stolice_oceanii_en",
  "panstwa_i_stolice_swiata_en",
] as const;

export const OFFICIAL_COURSE_AVAILABILITY = {
  pl: [
    ...POLISH_LANGUAGE_COURSE_SLUGS,
    ...POLISH_GENERAL_COURSE_SLUGS,
  ],
  en: [
    ...ENGLISH_LANGUAGE_COURSE_SLUGS,
    ...ENGLISH_GENERAL_COURSE_SLUGS,
  ],
} as const satisfies Record<NativeLanguage, readonly string[]>;

export type OfficialCourseAvailability = Record<
  NativeLanguage,
  readonly string[]
>;
