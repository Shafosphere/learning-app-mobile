import { imageMaps } from "./imageMaps";

export type OfficialPackCourseSettings = {
  // Domyślne ustawienia kursu nadpisywane podczas pierwszego załadowania pakietu
  autoflowEnabled?: boolean;
  // aliasy dla wygody
  Autoflow?: boolean;
  autoflow?: boolean;
  boxZeroEnabled?: boolean;
  boxZero?: boolean;
  skipCorrectionEnabled?: boolean;
  skipCorrection?: boolean;
  cardSize?: "large" | "small";
  imageSize?: "dynamic" | "small" | "medium" | "large" | "very_large";
  imageFrameEnabled?: boolean;
};

type OfficialPackDef = {
  slug: string;
  packVersion: number;
  name: string;
  // Optional global order (lower value appears first).
  // When omitted, UI falls back to existing alphabetical ordering.
  position?: number;
  iconId: string;
  iconColor: string;
  reviewsEnabled?: boolean;
  defaultType?: "traditional" | "true_false" | "self_assess";
  // Default flip behavior for rows without explicit CSV `flip` value
  defaultFlip?: boolean;
  sourceLang?: string;
  targetLang?: string;
  smallFlag?: string;
  imageMap?: Record<string, any>;
  // Marks whether the pack should be displayed as a mini course in UI groupings
  isMini?: boolean;
  categoryId?: string;
  // Opcjonalne ustawienia domyślne aplikowane przy seedowaniu oficjalnego kursu
  settings?: OfficialPackCourseSettings;
};

const DEFAULT_PACK_VERSION = 1;

// Manifest of official (built-in) packs included with the app bundle.
// Add new entries here to ship additional packs.
const OFFICIAL_PACKS_MANIFEST = ([
  {
    slug: "fiszki_podstawy_en_pl_slowa",
    packVersion: 2,
    name: "Podstawowe słówka",
    position: 1,
    iconId: "flag:en",
    iconColor: "#14B8A6",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    sourceLang: "en",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: false,
  },
  {
    slug: "eng_to_pl_a1",
    name: "Ang A1",
    iconId: "flag:en",
    iconColor: "#10B981",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    sourceLang: "en",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: false,
  },
  {
    slug: "eng_to_pl_a2",
    name: "Ang A2",
    iconId: "flag:en",
    iconColor: "#FBBF24",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    sourceLang: "en",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: false,
  },
  {
    slug: "eng_to_pl_b1",
    name: "Ang B1",
    iconId: "flag:en",
    iconColor: "#6366F1",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    sourceLang: "en",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: false,
  },
  {
    slug: "eng_to_pl_b2",
    name: "Ang B2",
    iconId: "flag:en",
    iconColor: "#EC4899",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    sourceLang: "en",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: false,
  },
  {
    slug: "astronomia",
    name: "Astronomia",
    iconId: "planet",
    iconColor: "#8B5CF6",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: false,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "kosmos",
  },
  {
    slug: "polska_historia",
    name: "Historia Polski",
    iconId: "book",
    iconColor: "#DC2626",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: false,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "historia",
  },
  {
    slug: "math2",
    name: "Matematyka",
    iconId: "calculator",
    iconColor: "#38BDF8",
    reviewsEnabled: true,
    defaultType: "self_assess",
    defaultFlip: false,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "math",
  },
  {
    slug: "javascript2",
    name: "JavaScript 2 (P/F)",
    iconId: "code",
    iconColor: "#22C55E",
    reviewsEnabled: true,
    defaultType: "true_false",
    defaultFlip: false,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "programming",
  },
  {
    slug: "grecka_mitologia_prawda_falsz_50",
    name: "Mitologia Grecka (P/F)",
    iconId: "book",
    iconColor: "#A855F7",
    reviewsEnabled: true,
    defaultType: "true_false",
    defaultFlip: false,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "mitologia",
  },
  {
    slug: "flagi_europy",
    name: "Flagi Europy",
    iconId: "globe",
    iconColor: "#22C55E",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "geography",
    settings: {
      imageSize: "medium",
    },
    imageMap: imageMaps.europeFlags,
  },
  {
    slug: "flagi_afryki",
    name: "Flagi Afryki",
    iconId: "globe",
    iconColor: "#F59E0B",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "geography",
    settings: {
      imageSize: "medium",
    },
    imageMap: imageMaps.africaFlags,
  },
  {
    slug: "flagi_azji",
    name: "Flagi Azji",
    iconId: "globe",
    iconColor: "#EF4444",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "geography",
    settings: {
      imageSize: "medium",
    },
    imageMap: imageMaps.asiaFlags,
  },
  {
    slug: "flagi_ameryki",
    name: "Flagi Ameryk",
    iconId: "globe",
    iconColor: "#06B6D4",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "geography",
    settings: {
      imageSize: "medium",
    },
    imageMap: imageMaps.americaFlags,
  },
  {
    slug: "flagi_oceanii",
    name: "Flagi Oceanii",
    iconId: "globe",
    iconColor: "#8B5CF6",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "geography",
    settings: {
      imageSize: "medium",
    },
    imageMap: imageMaps.oceaniaFlags,
  },
  {
    slug: "flagi_swiata",
    name: "Flagi Świata",
    iconId: "globe",
    iconColor: "#0EA5E9",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "geography",
    settings: {
      imageSize: "medium",
    },
    imageMap: {
      ...imageMaps.europeFlags,
      ...imageMaps.africaFlags,
      ...imageMaps.asiaFlags,
      ...imageMaps.americaFlags,
      ...imageMaps.oceaniaFlags,
    },
  },
  {
    slug: "panstwa_i_stolice_europy",
    name: "Stolice Europy",
    iconId: "globe",
    iconColor: "#22C55E",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "geography",
  },
  {
    slug: "panstwa_i_stolice_afryki",
    name: "Stolice Afryki",
    iconId: "globe",
    iconColor: "#F59E0B",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "geography",
  },
  {
    slug: "panstwa_i_stolice_azji",
    name: "Stolice Azji",
    iconId: "globe",
    iconColor: "#EF4444",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "geography",
  },
  {
    slug: "panstwa_i_stolice_ameryki",
    name: "Stolice Ameryk",
    iconId: "globe",
    iconColor: "#06B6D4",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "geography",
  },
  {
    slug: "panstwa_i_stolice_oceanii",
    name: "Stolice Oceanii",
    iconId: "globe",
    iconColor: "#8B5CF6",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "geography",
  },
  {
    slug: "panstwa_i_stolice_swiata",
    name: "Stolice Świata",
    iconId: "globe",
    iconColor: "#0EA5E9",
    reviewsEnabled: true,
    defaultType: "traditional",
    defaultFlip: true,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "geography",
  },
]) satisfies (Omit<OfficialPackDef, "packVersion"> & {
  packVersion?: number;
})[];

export const OFFICIAL_PACKS: OfficialPackDef[] = OFFICIAL_PACKS_MANIFEST.map((pack) => ({
  packVersion: pack.packVersion ?? DEFAULT_PACK_VERSION,
  ...pack,
}));
