/* eslint-disable @typescript-eslint/no-require-imports */
import { OFFICIAL_PACKS } from "../officialPacks";
import { OFFICIAL_COURSE_AVAILABILITY } from "../officialCourseAvailability";
import elements from "../chemicalElements.json";
import { isStudyCardReversed } from "@/src/utils/flashcardDirection";

const { OFFICIAL_PACKS: buildPacks, readCardsFromCsv } = require("../../../tools/scripts/build-prebuilt-db");

it.each(["pl", "en"] as const)("includes every basic element unchanged in the full %s progressive stage", (locale) => {
  const stages = OFFICIAL_PACKS.filter(pack => pack.knowledgeGroupId === "elements" && pack.targetLang === locale)
    .sort((a, b) => a.position! - b.position!);
  const suffix = locale === "en" ? "_en" : "";
  expect(stages.map(pack => pack.slug)).toEqual([`pierwiastki_podstawowe${suffix}`, `pierwiastki_pozostale${suffix}`]);
  const cards = stages.map(pack => {
    expect(pack).toMatchObject({ sourceLang: locale, targetLang: locale, smallFlag: locale });
    expect(OFFICIAL_COURSE_AVAILABILITY[locale]).toContain(pack.slug);
    expect(OFFICIAL_COURSE_AVAILABILITY[locale === "en" ? "pl" : "en"]).not.toContain(pack.slug);
    const buildPack = buildPacks.find((entry: { slug: string }) => entry.slug === pack.slug);
    expect(buildPack).toMatchObject({ name: pack.name, packVersion: pack.packVersion });
    expect(pack.defaultFlip).toBe(true);
    return readCardsFromCsv(buildPack) as { externalId: string; frontText: string; backText: string; answers: string[]; flipped: boolean }[];
  });
  expect(cards[0]).toHaveLength(30);
  expect(cards[1]).toHaveLength(118);
  const fullSet = new Map(cards[1].map(card => [card.externalId, card]));
  expect(fullSet.size).toBe(118);
  for (const card of cards[0]) {
    expect(fullSet.get(card.externalId)).toEqual(expect.objectContaining({
      externalId: card.externalId, frontText: card.frontText, backText: card.backText, answers: card.answers,
    }));
  }
  for (const stage of cards) {
    for (const card of stage) {
      const element = elements.find(entry => entry.atomicNumber === Number(card.externalId))!;
      expect(card.frontText).toBe(element.symbol);
      expect(card.answers).toEqual([locale === "en" ? element.nameEn : element.name]);
      expect(card.flipped).toBe(true);
      const word = { id: 1, text: card.frontText, translations: card.answers, flipped: card.flipped };
      // Each advance changes direction with and without the introductory box.
      expect(isStudyCardReversed(word, "boxOne", false)).toBe(false);
      expect(isStudyCardReversed(word, "boxTwo", false)).toBe(true);
      expect(isStudyCardReversed(word, "boxOne", true)).toBe(true);
      expect(isStudyCardReversed(word, "boxTwo", true)).toBe(false);
    }
  }
});
