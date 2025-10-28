import prosteZwrotyCsv from "@/assets/data/proste_zwroty.csv";
import podstawoweSlowaCsv from "@/assets/data/podstawowe_slowa.csv";
import francuskiePodstawyCsv from "@/assets/data/francuskie_podstawy.csv";

export type OfficialPackDef = {
  slug: string;
  name: string;
  iconId: string;
  iconColor: string;
  reviewsEnabled?: boolean;
  sourceLang?: string;
  targetLang?: string;
  csvAsset: any;
};

// Manifest of official (built-in) packs included with the app bundle.
// Add new entries here to ship additional packs.
export const OFFICIAL_PACKS: OfficialPackDef[] = [
  {
    slug: "proste_zwroty",
    name: "Raz",
    iconId: "book",
    iconColor: "#4361EE",
    reviewsEnabled: true,
    sourceLang: "en",
    targetLang: "pl",
    csvAsset: prosteZwrotyCsv,
  },
  {
    slug: "podstawowe_slowa",
    name: "dwie linieas",
    iconId: "heart",
    iconColor: "#FF6B6B",
    reviewsEnabled: true,
    sourceLang: "en",
    targetLang: "pl",
    csvAsset: podstawoweSlowaCsv,
  },
  {
    slug: "francuskie_podstawy",
    name: "ToJEstNaprawdedluganzwwa",
    iconId: "book",
    iconColor: "#4CC9F0",
    reviewsEnabled: true,
    sourceLang: "fr",
    targetLang: "pl",
    csvAsset: francuskiePodstawyCsv,
  },
];
