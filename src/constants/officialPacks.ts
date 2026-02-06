import astronomiaCsv from "@/assets/data/astronomia.csv";
import engToPLA1Csv from "@/assets/data/ENGtoPL_A1.csv";
import engToPLA2Csv from "@/assets/data/ENGtoPL_A2.csv";
import engToPLB1Csv from "@/assets/data/ENGtoPL_B1.csv";
import engToPLB2Csv from "@/assets/data/ENGtoPL_B2.csv";
import flagiEuropyCsv from "@/assets/data/flagi_europy.csv";
import hangulPolishReadingCsv from "@/assets/data/hangul_polish_reading.csv";
import javascript2Csv from "@/assets/data/Javascript2.csv";
import stoliceUniiEuropejskiejCsv from "@/assets/data/stolice_unii_europejskiej.csv";
import math2Csv from "@/assets/data/math2.csv";
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
  imageSize?: "dynamic" | "small" | "medium" | "large";
};

export type OfficialPackDef = {
  slug: string;
  name: string;
  iconId: string;
  iconColor: string;
  reviewsEnabled?: boolean;
  sourceLang?: string;
  targetLang?: string;
  smallFlag?: string;
  imageMap?: Record<string, any>;
  // Marks whether the pack should be displayed as a mini course in UI groupings
  isMini?: boolean;
  categoryId?: string;
  // Opcjonalne ustawienia domyślne aplikowane przy seedowaniu oficjalnego kursu
  settings?: OfficialPackCourseSettings;
  csvAsset: any;
};

// Manifest of official (built-in) packs included with the app bundle.
// Add new entries here to ship additional packs.
export const OFFICIAL_PACKS: OfficialPackDef[] = [
  {
    slug: "eng_to_pl_a1",
    name: "Ang A1",
    iconId: "flag:en",
    iconColor: "#10B981",
    reviewsEnabled: true,
    sourceLang: "en",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: false,
    csvAsset: engToPLA1Csv,
  },
  {
    slug: "eng_to_pl_a2",
    name: "Ang A2",
    iconId: "flag:en",
    iconColor: "#FBBF24",
    reviewsEnabled: true,
    sourceLang: "en",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: false,
    csvAsset: engToPLA2Csv,
  },
  {
    slug: "eng_to_pl_b1",
    name: "Ang B1",
    iconId: "flag:en",
    iconColor: "#6366F1",
    reviewsEnabled: true,
    sourceLang: "en",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: false,
    csvAsset: engToPLB1Csv,
  },
  {
    slug: "eng_to_pl_b2",
    name: "Ang B2",
    iconId: "flag:en",
    iconColor: "#EC4899",
    reviewsEnabled: true,
    sourceLang: "en",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: false,
    csvAsset: engToPLB2Csv,
  },
  {
    slug: "hangul_polish_reading",
    name: "Hangul – czytanie",
    iconId: "book",
    iconColor: "#F97316",
    reviewsEnabled: true,
    sourceLang: "kr",
    targetLang: "pl",
    smallFlag: "kr",
    isMini: true,
    csvAsset: hangulPolishReadingCsv,
  },
  {
    slug: "stolice_unii_europejskiej",
    name: "Stolice UE",
    iconId: "planet",
    iconColor: "#14B8A6",
    reviewsEnabled: true,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "geography",
    csvAsset: stoliceUniiEuropejskiejCsv,
  },
  {
    slug: "astronomia",
    name: "Astronomia",
    iconId: "planet",
    iconColor: "#8B5CF6",
    reviewsEnabled: true,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "science",
    csvAsset: astronomiaCsv,
  },
  {
    slug: "math2",
    name: "Matematyka (Umiem/Nie umiem)",
    iconId: "calculator",
    iconColor: "#38BDF8",
    reviewsEnabled: true,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "math",
    csvAsset: math2Csv,
  },
  {
    slug: "javascript2",
    name: "JavaScript 2 (P/F)",
    iconId: "code",
    iconColor: "#22C55E",
    reviewsEnabled: true,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "programming",
    csvAsset: javascript2Csv,
  },
  {
    slug: "flagi_europy",
    name: "Flagi Europy",
    iconId: "globe",
    iconColor: "#22C55E",
    reviewsEnabled: true,
    sourceLang: "pl",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    categoryId: "geography",
    settings: {
      imageSize: "medium",
    },
    csvAsset: flagiEuropyCsv,
    imageMap: imageMaps.europeFlags,
  },
];
