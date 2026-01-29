import engToPLA1Csv from "@/assets/data/ENGtoPL_A1.csv";
import engToPLA2Csv from "@/assets/data/ENGtoPL_A2.csv";
import engToPLB1Csv from "@/assets/data/ENGtoPL_B1.csv";
import engToPLB2Csv from "@/assets/data/ENGtoPL_B2.csv";
import hangulPolishReadingCsv from "@/assets/data/hangul_polish_reading.csv";
import stoliceUniiEuropejskiejCsv from "@/assets/data/stolice_unii_europejskiej.csv";
import astronomiaCsv from "@/assets/data/astronomia.csv";
import javascript2Csv from "@/assets/data/Javascript2.csv";
import flagiEuropyCsv from "@/assets/data/flagi_europy.csv";

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
    csvAsset: flagiEuropyCsv,
    imageMap: {
      "ad.svg": require("@/assets/flags/europe/ad.svg"),
      "al.svg": require("@/assets/flags/europe/al.svg"),
      "at.svg": require("@/assets/flags/europe/at.svg"),
      "ax.svg": require("@/assets/flags/europe/ax.svg"),
      "ba.svg": require("@/assets/flags/europe/ba.svg"),
      "be.svg": require("@/assets/flags/europe/be.svg"),
      "bg.svg": require("@/assets/flags/europe/bg.svg"),
      "by.svg": require("@/assets/flags/europe/by.svg"),
      "ch.svg": require("@/assets/flags/europe/ch.svg"),
      "cy.svg": require("@/assets/flags/europe/cy.svg"),
      "cz.svg": require("@/assets/flags/europe/cz.svg"),
      "de.svg": require("@/assets/flags/europe/de.svg"),
      "dk.svg": require("@/assets/flags/europe/dk.svg"),
      "ee.svg": require("@/assets/flags/europe/ee.svg"),
      "es.svg": require("@/assets/flags/europe/es.svg"),
      "eu.svg": require("@/assets/flags/europe/eu.svg"),
      "fi.svg": require("@/assets/flags/europe/fi.svg"),
      "fo.svg": require("@/assets/flags/europe/fo.svg"),
      "fr.svg": require("@/assets/flags/europe/fr.svg"),
      "gb-eng.svg": require("@/assets/flags/europe/gb-eng.svg"),
      "gb-nir.svg": require("@/assets/flags/europe/gb-nir.svg"),
      "gb-sct.svg": require("@/assets/flags/europe/gb-sct.svg"),
      "gb.svg": require("@/assets/flags/europe/gb.svg"),
      "gb-wls.svg": require("@/assets/flags/europe/gb-wls.svg"),
      "gr.svg": require("@/assets/flags/europe/gr.svg"),
      "hr.svg": require("@/assets/flags/europe/hr.svg"),
      "hu.svg": require("@/assets/flags/europe/hu.svg"),
      "ie.svg": require("@/assets/flags/europe/ie.svg"),
      "is.svg": require("@/assets/flags/europe/is.svg"),
      "it.svg": require("@/assets/flags/europe/it.svg"),
      "li.svg": require("@/assets/flags/europe/li.svg"),
      "lt.svg": require("@/assets/flags/europe/lt.svg"),
      "lu.svg": require("@/assets/flags/europe/lu.svg"),
      "lv.svg": require("@/assets/flags/europe/lv.svg"),
      "mc.svg": require("@/assets/flags/europe/mc.svg"),
      "md.svg": require("@/assets/flags/europe/md.svg"),
      "me.svg": require("@/assets/flags/europe/me.svg"),
      "mk.svg": require("@/assets/flags/europe/mk.svg"),
      "mt.svg": require("@/assets/flags/europe/mt.svg"),
      "nl.svg": require("@/assets/flags/europe/nl.svg"),
      "no.svg": require("@/assets/flags/europe/no.svg"),
      "pl.svg": require("@/assets/flags/europe/pl.svg"),
      "pt.svg": require("@/assets/flags/europe/pt.svg"),
      "ro.svg": require("@/assets/flags/europe/ro.svg"),
      "rs.svg": require("@/assets/flags/europe/rs.svg"),
      "ru.svg": require("@/assets/flags/europe/ru.svg"),
      "se.svg": require("@/assets/flags/europe/se.svg"),
      "si.svg": require("@/assets/flags/europe/si.svg"),
      "sj.svg": require("@/assets/flags/europe/sj.svg"),
      "sk.svg": require("@/assets/flags/europe/sk.svg"),
      "sm.svg": require("@/assets/flags/europe/sm.svg"),
      "ua.svg": require("@/assets/flags/europe/ua.svg"),
      "va.svg": require("@/assets/flags/europe/va.svg"),
      "xk.svg": require("@/assets/flags/europe/xk.svg"),
    },
  },
];
