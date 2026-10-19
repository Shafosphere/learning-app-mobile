import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { LANGUAGE_COURSE_CONTRACTS, loadLanguageCourse } from "../cardLanguageScenarios";

describe.each(LANGUAGE_COURSE_CONTRACTS)("language contract: $slug ($userLanguage → $learningLanguage)", (contract) => {
  it("pins the CSV vocabulary, all accepted translations and starter defaults", () => {
    const course = loadLanguageCourse(contract);
    expect(course.card).toMatchObject({
      externalId: contract.externalId, text: contract.front, translations: contract.back,
      flipped: true, answerOnly: false, type: "text", imageFront: "water.webp", imageBack: null,
    });
    expect(course.settings).toMatchObject({
      boxZeroEnabled: true, boxZeroAnswerSide: "front", frontImageRole: "replace_back",
      audioSettings: { enabled: true },
    });
    if (course.pack) {
      expect(course.pack).toMatchObject({ sourceLang: contract.learningLanguage, targetLang: contract.userLanguage, defaultFlip: true });
      expect(course.pack.imageMap?.["water.webp"]).toBeDefined();
    } else {
      expect(OFFICIAL_PACKS.some(({ slug }) => slug === contract.slug)).toBe(false);
    }
  });
});
