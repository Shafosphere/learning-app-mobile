/* eslint-disable @typescript-eslint/no-require-imports */
import { OFFICIAL_PACKS } from "../officialPacks";
import { OFFICIAL_COURSE_AVAILABILITY } from "../officialCourseAvailability";
import { imageMaps } from "../imageMaps";

const { OFFICIAL_PACKS: buildPacks, readCardsFromCsv, resolveCsvPath } = require("../../../tools/scripts/build-prebuilt-db");

type Card = { externalId: string; frontText: string; backText: string; flipped: boolean; imageFront: string | null; imageBack: string | null };
const stages = [
  { group: "frenchFromZero", source: "fr", slugs: ["fr_to_en_first_50", "fr_to_en_first_150", "fr_to_en_first_332", "french_a1"], counts: [50, 150, 332, 865] },
  { group: "spanishFromZero", source: "es", slugs: ["es_to_en_first_50", "es_to_en_first_150", "es_to_en_first_327"], counts: [50, 150, 327] },
];
const forms = (text: string) => text.split(";").map((form) => form.normalize("NFC").trim().toLowerCase().replaceAll("’", "'"));

describe.each(stages)("$source courses for English speakers", ({ group, source, slugs, counts }) => {
  const series = OFFICIAL_PACKS.filter((pack) => pack.languageGroupId === group && pack.targetLang === "en");

  it("registers ordered stages with stage-specific settings and English CSV sources", () => {
    expect(series.map((pack) => pack.slug)).toEqual(slugs);
    expect(series.map((pack) => pack.position)).toEqual(slugs.map((_, index) => index + 1));
    for (const [index, pack] of series.entries()) {
      expect(pack).toMatchObject({ sourceLang: source, targetLang: "en", smallFlag: "en", isMini: false,
        reviewsEnabled: true, defaultType: "traditional", defaultFlip: true });
      expect(pack.settings).toEqual({
        boxZeroEnabled: true,
        boxZeroAnswerSide: "front",
        audioEnabled: true,
        ...(index === 0 ? { frontImageRole: "replace_back" } : {}),
        ...(index < 2 ? {
          letterHintSettings: { enabled: true, profile: "standard", boxOneLimit: 2, boxTwoLimit: 1 },
        } : {}),
      });
      expect(OFFICIAL_COURSE_AVAILABILITY.en).toContain(pack.slug);
      expect(OFFICIAL_COURSE_AVAILABILITY.pl).not.toContain(pack.slug);
      const buildPack = buildPacks.find((candidate: { slug: string }) => candidate.slug === pack.slug);
      expect(buildPack).toMatchObject({ name: pack.name, packVersion: pack.packVersion,
        defaultFlip: true, reviewsEnabled: true, csvLocale: "en" });
      expect(resolveCsvPath(buildPack)).toContain("/prebuild-data/en/");
      const cards: Card[] = readCardsFromCsv(buildPack);
      expect(cards).toHaveLength(counts[index]);
      expect(cards.every((card) => card.flipped)).toBe(true);
    }
  });

  it("includes earlier vocabulary and only uses starter images in the first stage", () => {
    let previous: Card[] = [];
    for (const [index, pack] of series.entries()) {
      const cards: Card[] = readCardsFromCsv(buildPacks.find((candidate: { slug: string }) => candidate.slug === pack.slug));
      const vocabulary = new Set(cards.flatMap((card) => forms(card.frontText)));
      for (const card of previous) expect(forms(card.frontText).some((form) => vocabulary.has(form))).toBe(true);
      if (pack.slug !== "french_a1") {
        const byId = new Map(cards.map((card) => [card.externalId, card]));
        for (const card of previous) expect(byId.get(card.externalId)).toMatchObject({ frontText: card.frontText, backText: card.backText });
      }
      const images = cards.flatMap((card) => [card.imageFront, card.imageBack]).filter((name): name is string => Boolean(name));
      expect(images).toHaveLength(index === 0 ? 50 : 0);
      if (index === 0) {
        expect(pack.imageMap).toBe(imageMaps.englishA1);
        for (const image of images) expect(Object.prototype.hasOwnProperty.call(pack.imageMap, image)).toBe(true);
      } else expect(pack.imageMap).toBeUndefined();
      previous = cards;
    }
  });
});

it("upgrades French A1 in place and leaves advanced French courses outside the series", () => {
  expect(OFFICIAL_PACKS.find((pack) => pack.slug === "french_a1")).toMatchObject({ packVersion: 2, position: 4 });
  for (const slug of ["french_a2", "french_b1", "french_b2"]) {
    expect(OFFICIAL_PACKS.find((pack) => pack.slug === slug)?.languageGroupId).toBeUndefined();
  }
});
