export type AttributionCourseRegistryEntry = {
  id: string;
  sourcePath: string;
  title: { pl: string; en: string };
  defaultChanges: { pl: string; en: string };
};

export const ATTRIBUTION_COURSES: AttributionCourseRegistryEntry[] = [
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
