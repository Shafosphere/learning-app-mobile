import type { ManualCard, ManualCardType } from "@/src/hooks/useManualCardsForm";

export type AddMode = "csv" | "manual";

export const CONTENT_DRAFT_STORAGE_KEY = "customCourse.contentDraft.v1";
export const SETTINGS_DRAFT_STORAGE_KEY = "customCourse.settingsDraft.v1";

export type ContentDraftPayload = {
  scopeKey: string;
  addMode: AddMode;
  newCardType: ManualCardType;
  csvFileName: string | null;
  manualCards: ManualCard[];
};

export type SettingsDraftPayload = {
  scopeKey: string;
  boxZeroEnabled: boolean;
  autoflowEnabled: boolean;
  reviewsEnabled: boolean;
  showExplanationEnabled: boolean;
  explanationOnlyOnWrong: boolean;
  skipCorrectionEnabled: boolean;
  trueFalseButtonsVariant: "true_false" | "know_dont_know";
  cardSize: "large" | "small";
  imageSize: "dynamic" | "small" | "medium" | "large" | "very_large";
  imageFrameEnabled: boolean;
};

export const isManualCardType = (value: unknown): value is ManualCardType =>
  value === "text" || value === "true_false" || value === "know_dont_know";

export const isAddMode = (value: unknown): value is AddMode =>
  value === "csv" || value === "manual";

export const makeCustomCourseDraftScopeKey = (params: {
  courseName: string;
  iconId: string;
  iconColor: string;
  colorId: string | null;
  reviewsEnabled: boolean;
}): string =>
  [
    params.courseName.trim(),
    params.iconId.trim(),
    params.iconColor.trim(),
    params.colorId ?? "",
    params.reviewsEnabled ? "1" : "0",
  ].join("|");

export const normalizeDraftCards = (raw: unknown): ManualCard[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry, index) => {
    const item = entry as Partial<ManualCard> | null;
    const answers = Array.isArray(item?.answers)
      ? item.answers.map((answer) => `${answer ?? ""}`)
      : [""];
    const normalizedAnswers = answers.length > 0 ? answers : [""];
    return {
      id:
        typeof item?.id === "string" && item.id.trim().length > 0
          ? item.id
          : `draft-${Date.now()}-${index}`,
      front: typeof item?.front === "string" ? item.front : "",
      answers: normalizedAnswers,
      flipped: Boolean(item?.flipped),
      answerOnly: Boolean(item?.answerOnly),
      type: isManualCardType(item?.type) ? item.type : "text",
      hintFront: typeof item?.hintFront === "string" ? item.hintFront : "",
      hintBack: typeof item?.hintBack === "string" ? item.hintBack : "",
      imageFront:
        typeof item?.imageFront === "string" && item.imageFront.length > 0
          ? item.imageFront
          : null,
      imageBack:
        typeof item?.imageBack === "string" && item.imageBack.length > 0
          ? item.imageBack
          : null,
      explanation:
        typeof item?.explanation === "string" && item.explanation.length > 0
          ? item.explanation
          : null,
    };
  });
};
