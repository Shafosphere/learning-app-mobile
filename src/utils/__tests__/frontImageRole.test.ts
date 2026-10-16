import type { CourseFrontImageRole } from "@/src/contexts/settings/types";
import type { WordWithTranslations } from "@/src/types/boxes";
import { isStudyCardReversed } from "../flashcardDirection";
import { normalizeCourseFrontImageRole, normalizeFrontImageRoleOverrides, resolveCardPromptPresentation } from "../frontImageRole";

const card: WordWithTranslations = {
  id: 1, text: "spoon", translations: ["łyżka"], flipped: true,
  imageFront: "spoon.webp", imageBack: "back.webp", type: "text",
};

function resolve(role: CourseFrontImageRole, reversed: boolean, overrides: Partial<WordWithTranslations> = {}, stage: "question" | "intro" | "correction" = "question") {
  const word = { ...card, ...overrides };
  return resolveCardPromptPresentation({
    card: word, role, reversed, stage,
    standard: {
      text: reversed ? word.translations[0] ?? "" : word.text,
      imageUri: (reversed ? word.imageBack : word.imageFront) ?? null,
      audioSide: reversed ? "back" : "front",
    },
  });
}

describe("front image role", () => {
  it.each([undefined, null, "bad", {}, false, 0])("normalizes invalid role %s to standard", (value) => {
    expect(normalizeCourseFrontImageRole(value)).toBe("standard");
  });

  it("normalizes malformed maps and preserves explicit standard", () => {
    expect(normalizeFrontImageRoleOverrides(null)).toEqual({ builtin: {}, custom: {} });
    expect(normalizeFrontImageRoleOverrides({ builtin: [], custom: { 1: "bad", 2: "standard", 3: "replace_back" } }))
      .toEqual({ builtin: {}, custom: { 1: "standard", 2: "standard", 3: "replace_back" } });
  });

  it.each([false, true])("preserves the complete legacy prompt (reversed: %s)", (reversed) => {
    expect(resolve("standard", reversed)).toEqual({
      text: reversed ? "łyżka" : "spoon", imageUri: reversed ? "back.webp" : "spoon.webp",
      audioSide: reversed ? "back" : "front",
    });
  });

  it.each([
    ["replace_front", false], ["replace_back", true],
  ] as const)("replaces only the question, including its audio: %s/%s", (role, reversed) => {
    expect(resolve(role, reversed)).toEqual({ text: "", imageUri: "spoon.webp", audioSide: null });
  });

  it("hides the answer image while preserving an ordinary back image", () => {
    expect(resolve("replace_back", false)).toEqual({ text: "spoon", imageUri: null, audioSide: "front" });
    expect(resolve("replace_front", true)).toEqual({ text: "łyżka", imageUri: "back.webp", audioSide: "back" });
    expect(resolve("replace_front", true, { imageBack: null }).imageUri).toBeNull();
  });

  it.each([
    { imageFront: null }, { text: "" }, { translations: [] }, { translations: [" "] },
    { answerOnly: true }, { type: "true_false" as const }, { type: "know_dont_know" as const },
  ])("retains legacy behavior for ineligible cards: %j", (overrides) => {
    for (const reversed of [false, true]) {
      for (const role of ["replace_front", "replace_back"] as const) {
        expect(resolve(role, reversed, overrides)).toEqual(resolve("standard", reversed, overrides));
      }
    }
  });

  it.each(["intro", "correction"] as const)("keeps images and text together during %s", (stage) => {
    for (const role of ["replace_front", "replace_back"] as const) {
      for (const reversed of [false, true]) {
        expect(resolve(role, reversed, {}, stage)).toEqual({
          text: reversed ? "łyżka" : "spoon", imageUri: "spoon.webp",
          audioSide: reversed ? "back" : "front",
        });
        expect(resolve("standard", reversed, {}, stage)).toEqual(resolve("standard", reversed));
      }
    }
  });

  it.each([true, false])("follows actual box direction with box zero %s", (boxZeroEnabled) => {
    for (const flipped of [true, false]) {
      const word = { ...card, flipped };
      for (const box of ["boxOne", "boxTwo", "boxThree", "boxFour", "boxFive"] as const) {
        const reversed = isStudyCardReversed(word, box, boxZeroEnabled);
        const result = resolve("replace_back", reversed, { flipped });
        expect(result.text).toBe(reversed ? "" : "spoon");
        expect(result.imageUri).toBe(reversed ? "spoon.webp" : null);
      }
    }
  });
});
