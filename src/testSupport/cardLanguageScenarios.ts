import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { resolveCourseSettingsDefaults } from "@/src/contexts/settings/courseSettingsDefaults";
import type { CourseFrontImageRole } from "@/src/contexts/settings/types";
import type { CustomFlashcardRecord } from "@/src/db/sqlite/repositories/flashcards";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";
import { mapCustomCardToWord } from "@/src/utils/flashcardsMapper";
import type { CardPromptPresentation } from "@/src/utils/frontImageRole";

// Read the same CSV sources as the database builder; never build or write a DB.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { OFFICIAL_PACKS: buildPacks, readCardsFromCsv } = require("../../tools/scripts/build-prebuilt-db") as {
  OFFICIAL_PACKS: { slug: string }[];
  readCardsFromCsv: (pack: { slug: string }) => Omit<CustomFlashcardRecord, "id" | "courseId" | "createdAt" | "updatedAt">[];
};

export type AnswerSide = "front" | "back";
export type StudyBox = Exclude<keyof BoxesState, "boxZero">;
type SideExpectation = {
  answers: string[];
  rejected: string[];
  correctionInput: 1 | 2;
  letterHint: string;
  prompts: Record<CourseFrontImageRole, CardPromptPresentation>;
};
type CourseContract = {
  slug: string;
  userLanguage: string;
  learningLanguage: string;
  externalId: string;
  front: string;
  back: string[];
  introPrompt: string;
  expectations: Record<AnswerSide, SideExpectation>;
};

const imagePrompt: CardPromptPresentation = { text: "", imageUri: "water.webp", audioSide: null };

/** Product expectations. Do not derive these from direction/presentation helpers. */
export const LANGUAGE_COURSE_CONTRACTS: CourseContract[] = [
  {
    slug: "eng_to_pl_first_50", userLanguage: "pl", learningLanguage: "en", externalId: "0092",
    front: "water", back: ["woda", "podlewać", "polewać", "wodny"], introPrompt: "water",
    expectations: {
      front: {
        answers: ["water"], rejected: ["woda", "podlewać", "polewać", "wodny"], correctionInput: 1, letterHint: "w",
        prompts: {
          standard: { text: "woda", imageUri: null, audioSide: "back" },
          replace_front: { text: "woda", imageUri: null, audioSide: "back" },
          replace_back: imagePrompt,
        },
      },
      back: {
        answers: ["woda", "podlewać", "polewać", "wodny"], rejected: ["water"], correctionInput: 2, letterHint: "w",
        prompts: {
          standard: { text: "water", imageUri: "water.webp", audioSide: "front" },
          replace_front: imagePrompt,
          replace_back: { text: "water", imageUri: null, audioSide: "front" },
        },
      },
    },
  },
  {
    slug: "fr_to_en_first_50", userLanguage: "en", learningLanguage: "fr", externalId: "0001",
    front: "eau", back: ["water"], introPrompt: "eau",
    expectations: {
      front: {
        answers: ["eau"], rejected: ["water"], correctionInput: 1, letterHint: "e",
        prompts: {
          standard: { text: "water", imageUri: null, audioSide: "back" },
          replace_front: { text: "water", imageUri: null, audioSide: "back" },
          replace_back: imagePrompt,
        },
      },
      back: {
        answers: ["water"], rejected: ["eau"], correctionInput: 2, letterHint: "w",
        prompts: {
          standard: { text: "eau", imageUri: "water.webp", audioSide: "front" },
          replace_front: imagePrompt,
          replace_back: { text: "eau", imageUri: null, audioSide: "front" },
        },
      },
    },
  },
  {
    slug: "es_to_en_first_50", userLanguage: "en", learningLanguage: "es", externalId: "0001",
    front: "agua", back: ["water"], introPrompt: "agua",
    expectations: {
      front: {
        answers: ["agua"], rejected: ["water"], correctionInput: 1, letterHint: "a",
        prompts: {
          standard: { text: "water", imageUri: null, audioSide: "back" },
          replace_front: { text: "water", imageUri: null, audioSide: "back" },
          replace_back: imagePrompt,
        },
      },
      back: {
        answers: ["water"], rejected: ["agua"], correctionInput: 2, letterHint: "w",
        prompts: {
          standard: { text: "agua", imageUri: "water.webp", audioSide: "front" },
          replace_front: imagePrompt,
          replace_back: { text: "agua", imageUri: null, audioSide: "front" },
        },
      },
    },
  },
  {
    slug: "test_polish_for_english", userLanguage: "en", learningLanguage: "pl", externalId: "test-water",
    front: "woda", back: ["water"], introPrompt: "woda",
    expectations: {
      front: {
        answers: ["woda"], rejected: ["water"], correctionInput: 1, letterHint: "w",
        prompts: {
          standard: { text: "water", imageUri: null, audioSide: "back" },
          replace_front: { text: "water", imageUri: null, audioSide: "back" },
          replace_back: imagePrompt,
        },
      },
      back: {
        answers: ["water"], rejected: ["woda"], correctionInput: 2, letterHint: "w",
        prompts: {
          standard: { text: "woda", imageUri: "water.webp", audioSide: "front" },
          replace_front: imagePrompt,
          replace_back: { text: "woda", imageUri: null, audioSide: "front" },
        },
      },
    },
  },
];

export const STUDY_DIRECTION_CONTRACTS: {
  boxZeroEnabled: boolean; box: StudyBox; answerSide: AnswerSide; reversed: boolean;
}[] = [
  { boxZeroEnabled: true, box: "boxOne", answerSide: "front", reversed: true },
  { boxZeroEnabled: true, box: "boxTwo", answerSide: "back", reversed: false },
  { boxZeroEnabled: true, box: "boxThree", answerSide: "front", reversed: true },
  { boxZeroEnabled: true, box: "boxFour", answerSide: "back", reversed: false },
  { boxZeroEnabled: true, box: "boxFive", answerSide: "front", reversed: true },
  { boxZeroEnabled: false, box: "boxOne", answerSide: "back", reversed: false },
  { boxZeroEnabled: false, box: "boxTwo", answerSide: "front", reversed: true },
  { boxZeroEnabled: false, box: "boxThree", answerSide: "back", reversed: false },
  { boxZeroEnabled: false, box: "boxFour", answerSide: "front", reversed: true },
  { boxZeroEnabled: false, box: "boxFive", answerSide: "back", reversed: false },
];

export function loadLanguageCourse(contract: CourseContract) {
  const pack = OFFICIAL_PACKS.find(({ slug }) => slug === contract.slug);
  const buildPack = buildPacks.find(({ slug }) => slug === contract.slug);
  const id = 700 + LANGUAGE_COURSE_CONTRACTS.indexOf(contract);
  let row: CustomFlashcardRecord;
  if (contract.slug === "test_polish_for_english") {
    row = {
      id, courseId: id, externalId: contract.externalId, frontText: "woda", backText: "water",
      answers: ["water"], flipped: true, answerOnly: false, imageFront: "water.webp", imageBack: null,
      hintFront: null, hintBack: null, explanation: null, position: 0,
      isOfficial: false, resetProgressOnUpdate: false, type: "text", createdAt: 0, updatedAt: 0,
    };
  } else {
    if (!pack || !buildPack) throw new Error(`Missing official course: ${contract.slug}`);
    const csvRow = readCardsFromCsv(buildPack).find(({ externalId }) => externalId === contract.externalId);
    if (!csvRow) throw new Error(`Missing card ${contract.slug}/${contract.externalId}`);
    row = { ...csvRow, id, courseId: id, createdAt: 0, updatedAt: 0 };
  }
  const settings = resolveCourseSettingsDefaults(pack ?? {
    reviewsEnabled: true,
    settings: { boxZeroEnabled: true, boxZeroAnswerSide: "front", frontImageRole: "replace_back", audioEnabled: true },
  });
  return { ...contract, courseId: id, pack, row, card: mapCustomCardToWord(row), settings };
}

export type LanguageCourseFixture = ReturnType<typeof loadLanguageCourse>;

export const LANGUAGE_STUDY_SCENARIOS = LANGUAGE_COURSE_CONTRACTS.flatMap((contract) => {
  const course = loadLanguageCourse(contract);
  return STUDY_DIRECTION_CONTRACTS.map((direction) => ({
    ...direction, course, slug: course.slug, expected: course.expectations[direction.answerSide],
  }));
});

export const LANGUAGE_REVIEW_SCENARIOS = LANGUAGE_COURSE_CONTRACTS.flatMap((contract) => {
  const course = loadLanguageCourse(contract);
  return [1, 2, 3, 4, 5].flatMap((stage) => [
    { slug: course.slug, course, stage, flipped: true, answerSide: "front" as const, expected: course.expectations.front },
    { slug: course.slug, course, stage, flipped: false, answerSide: "back" as const, expected: course.expectations.back },
  ]);
});

export function boxesWithCard(box: keyof BoxesState, card: WordWithTranslations): BoxesState {
  return { boxZero: [], boxOne: [], boxTwo: [], boxThree: [], boxFour: [], boxFive: [], [box]: [card] };
}
