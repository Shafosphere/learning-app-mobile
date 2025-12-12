import engToPLA1Csv from "@/assets/data/ENGtoPL_A1.csv";
import engToPLA2Csv from "@/assets/data/ENGtoPL_A2.csv";
import engToPLB1Csv from "@/assets/data/ENGtoPL_B1.csv";
import engToPLB2Csv from "@/assets/data/ENGtoPL_B2.csv";
import francuskiePodstawyCsv from "@/assets/data/francuskie_podstawy.csv";
import hangulPolishReadingCsv from "@/assets/data/hangul_polish_reading.csv";
import podstawoweSlowaCsv from "@/assets/data/podstawowe_slowa.csv";
import prosteZwrotyCsv from "@/assets/data/proste_zwroty.csv";
import stoliceUniiEuropejskiejCsv from "@/assets/data/stolice_unii_europejskiej.csv";

export type OfficialPackDef = {
  slug: string;
  name: string;
  iconId: string;
  iconColor: string;
  reviewsEnabled?: boolean;
  sourceLang?: string;
  targetLang?: string;
  smallFlag?: string;
  // Marks whether the pack should be displayed as a mini course in UI groupings
  isMini?: boolean;
  categoryId?: string;
  csvAsset: any;
};

// Manifest of official (built-in) packs included with the app bundle.
// Add new entries here to ship additional packs.
export const OFFICIAL_PACKS: OfficialPackDef[] = [
  {
    slug: "eng_to_pl_a1",
    name: "Angielski A1",
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
    name: "Angielski A2",
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
    name: "Angielski B1",
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
    name: "Angielski B2",
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
    slug: "proste_zwroty",
    name: "Raz",
    iconId: "book",
    iconColor: "#4361EE",
    reviewsEnabled: true,
    sourceLang: "en",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    csvAsset: prosteZwrotyCsv,
  },
  {
    slug: "podstawowe_slowa",
    name: "Podstawowe zwroty",
    iconId: "heart",
    iconColor: "#FF6B6B",
    reviewsEnabled: true,
    sourceLang: "en",
    targetLang: "pl",
    smallFlag: "pl",
    isMini: true,
    csvAsset: podstawoweSlowaCsv,
  },
  {
    slug: "francuskie_podstawy",
    name: "Francuskie podstawy",
    iconId: "book",
    iconColor: "#4CC9F0",
    reviewsEnabled: true,
    sourceLang: "fr",
    targetLang: "pl",
    smallFlag: "fr",
    isMini: true,
    csvAsset: francuskiePodstawyCsv,
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
];
