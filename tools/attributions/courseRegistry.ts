export type AttributionCourseRegistryEntry = {
  id: string;
  sourcePath: string;
  title: { pl: string; en: string };
  defaultChanges: { pl: string; en: string };
};

export const ATTRIBUTION_COURSES: AttributionCourseRegistryEntry[] = [
  ...[
    { id: "wladcy_polski_portrety", pl: "Władcy Polski — rozpoznaj portret", en: "Rulers of Poland — identify the portrait" },
    { id: "wladcy_polski_portrety_daty", pl: "Władcy Polski — portret i lata panowania", en: "Rulers of Poland — portraits and reign dates" },
  ].map(({ id, pl, en }) => ({
    id,
    sourcePath: "tools/prebuild-data/pl/historia/wladcy_polski/attributions.tsv",
    title: { pl, en },
    defaultChanges: {
      pl: "Zachowano proporcje, zmniejszono do maksymalnie 800 × 800 px i przekonwertowano do WebP (jakość 80).",
      en: "Preserved aspect ratio, resized to at most 800 × 800 px, and converted to WebP (quality 80).",
    },
  })),
  ...[
    { id: "grzyby_podstawowe", pl: "Podstawowe grzyby", en: "Basic mushrooms", file: "attributions-podstawowe.tsv" },
    { id: "grzyby_rozpoznawanie", pl: "Wszystkie grzyby", en: "All mushrooms", file: "attributions.tsv" },
  ].map(({ id, pl, en, file }) => ({
    id,
    sourcePath: `tools/prebuild-data/pl/przyroda/grzyby/${file}`,
    title: { pl, en },
    defaultChanges: {
      pl: "Wykorzystano miniaturę Wikimedia Commons; bez dodatkowych zmian.",
      en: "Used the Wikimedia Commons thumbnail; no additional changes.",
    },
  })),
  {
    id: "drzewa_europy",
    sourcePath: "tools/prebuild-data/pl/przyroda/drzewa/attributions.tsv",
    title: { pl: "Drzewa Europy — drzewa i liście", en: "European trees — trees and leaves" },
    defaultChanges: {
      pl: "Wykorzystano miniaturę Wikimedia Commons; bez dodatkowych zmian.",
      en: "Used the Wikimedia Commons thumbnail; no additional changes.",
    },
  },
  {
    id: "birds",
    sourcePath: "tools/prebuild-data/pl/przyroda/ptaki/Ptaki_Polski_i_Europy_Srodkowej(1).tsv",
    title: {
      pl: "Ptaki Polski i Europy Środkowej",
      en: "Birds of Poland and Central Europe",
    },
    defaultChanges: {
      pl: "Zoptymalizowano rozmiar i przekonwertowano do WebP.",
      en: "Resized and converted to WebP.",
    },
  },
];
