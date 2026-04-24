import type { CsvCardType } from "@/src/features/customCourse/csvImport/types";

const removeDiacritics = (value: string): string =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const normalizeToken = (value: string): string =>
  removeDiacritics(value.trim().toLowerCase()).replace(/[\s\-\/]+/g, "_");

type CanonicalCsvField =
  | "type"
  | "front_text"
  | "back_text"
  | "front_image"
  | "back_image"
  | "tf_answer"
  | "flip"
  | "explanation";

const FIELD_ALIASES: Record<string, CanonicalCsvField> = {
  type: "type",
  typ: "type",
  rodzaj: "type",
  card_type: "type",
  front_text: "front_text",
  front: "front_text",
  question: "front_text",
  awers: "front_text",
  przod: "front_text",
  back_text: "back_text",
  back: "back_text",
  answer: "back_text",
  rewers: "back_text",
  tyl: "back_text",
  front_image: "front_image",
  front_img: "front_image",
  image_front: "front_image",
  obraz_awers: "front_image",
  awers_obraz: "front_image",
  back_image: "back_image",
  back_img: "back_image",
  image_back: "back_image",
  obraz_rewers: "back_image",
  rewers_obraz: "back_image",
  tf_answer: "tf_answer",
  tf: "tf_answer",
  true_false_answer: "tf_answer",
  odpowiedz_tf: "tf_answer",
  flip: "flip",
  odwroc: "flip",
  odwracaj: "flip",
  explanation: "explanation",
  wyjasnienie: "explanation",
  komentarz: "explanation",
};

const TYPE_ALIASES: Record<string, CsvCardType> = {
  traditional: "traditional",
  text: "traditional",
  odpowiedz_tekstowa: "traditional",
  tekstowa: "traditional",
  true_false: "true_false",
  prawda_falsz: "true_false",
  self_assess: "self_assess",
  selfassess: "self_assess",
  samoocena: "self_assess",
  umiem_nie_umiem: "self_assess",
};

export const normalizeCsvHeaderKey = (key: string): string => {
  const normalized = normalizeToken(key);
  return FIELD_ALIASES[normalized] ?? normalized;
};

export const parseCsvCardType = (value: unknown): CsvCardType | null => {
  const normalized = normalizeToken(typeof value === "string" ? value : `${value ?? ""}`);
  if (!normalized) return null;
  return TYPE_ALIASES[normalized] ?? null;
};

export const getCsvFieldLabel = (field: string, locale: "pl" | "en"): string => {
  const canonical = normalizeCsvHeaderKey(field);
  if (locale === "pl") {
    const plLabels: Record<string, string> = {
      type: "typ",
      front_text: "awers",
      back_text: "rewers",
      front_image: "obraz_awers",
      back_image: "obraz_rewers",
      tf_answer: "odpowiedz_tf",
      flip: "odwroc",
      explanation: "wyjasnienie",
    };
    return plLabels[canonical] ?? canonical;
  }
  return canonical;
};

