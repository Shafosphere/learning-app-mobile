import type { CourseFrontImageRole, CourseOverrideState } from "@/src/contexts/settings/types";
import type { WordWithTranslations } from "@/src/types/boxes";

export const COURSE_FRONT_IMAGE_ROLE_STORAGE_KEY = "flashcards.courseFrontImageRoleOverrides";

export function normalizeCourseFrontImageRole(value: unknown): CourseFrontImageRole {
  return value === "replace_front" || value === "replace_back" ? value : "standard";
}

export function normalizeFrontImageRoleOverrides(value: unknown): CourseOverrideState<CourseFrontImageRole> {
  const raw = value as Partial<CourseOverrideState<unknown>> | null;
  const normalizeMap = (map: unknown) => Object.fromEntries(
    Object.entries(map && typeof map === "object" && !Array.isArray(map) ? map : {})
      .map(([key, role]) => [key, normalizeCourseFrontImageRole(role)]),
  );
  return { builtin: normalizeMap(raw?.builtin), custom: normalizeMap(raw?.custom) };
}

export type CardPromptPresentation = {
  text: string;
  imageUri: string | null;
  audioSide: "front" | "back" | null;
};

export function isFrontImageRoleApplicable(
  card: WordWithTranslations | null | undefined,
  role: CourseFrontImageRole,
): card is WordWithTranslations {
  return role !== "standard" && Boolean(card?.imageFront) &&
    (!card?.type || card.type === "text") && !card?.answerOnly &&
    Boolean(card?.text?.trim()) && Boolean(card?.translations?.some((answer) => answer.trim()));
}

/** Direction and answer checking remain independent of the visual prompt. */
export function resolveCardPromptPresentation({
  card, role, reversed, stage, standard,
}: {
  card: WordWithTranslations | null | undefined;
  role: CourseFrontImageRole;
  reversed: boolean;
  stage: "question" | "intro" | "correction";
  standard: CardPromptPresentation;
}): CardPromptPresentation {
  if (!isFrontImageRoleApplicable(card, role)) return standard;

  if (stage !== "question") return { ...standard, imageUri: card.imageFront ?? null };

  const replacesPrompt = role === "replace_back" ? reversed : !reversed;
  if (replacesPrompt) return { text: "", imageUri: card.imageFront ?? null, audioSide: null };

  // The front image now represents the answer; retain only the ordinary back image.
  return { ...standard, imageUri: reversed ? card.imageBack ?? null : null };
}
