export type OfficialPackDef = {
  slug: string;
  name: string;
  iconId: string;
  iconColor: string;
  reviewsEnabled?: boolean;
  csvAsset: any;
};

// Manifest of official (built-in) packs included with the app bundle.
// Add new entries here to ship additional packs.
export const OFFICIAL_PACKS: OfficialPackDef[] = [
  {
    slug: "proste_zwroty",
    name: "Proste zwroty",
    iconId: "book",
    iconColor: "#4361EE",
    reviewsEnabled: true,
    csvAsset: require("@/assets/data/proste_zwroty.csv"),
  },
  {
    slug: "podstawowe_slowa",
    name: "Podstawowe słowa",
    iconId: "heart",
    iconColor: "#FF6B6B",
    reviewsEnabled: true,
    csvAsset: require("@/assets/data/podstawowe_slowa.csv"),
  },
];

