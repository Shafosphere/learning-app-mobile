/* eslint-disable @typescript-eslint/no-require-imports */
import { OFFICIAL_PACKS } from "../officialPacks";
import { OFFICIAL_COURSE_AVAILABILITY } from "../officialCourseAvailability";
import { imageMaps } from "../imageMaps";
import { LANGUAGE_COURSE_GROUPS } from "../languageCourseGroups";
import pl from "@/src/locales/pl.json";
import en from "@/src/locales/en.json";

const { OFFICIAL_PACKS: buildPacks, readCardsFromCsv } = require("../../../tools/scripts/build-prebuilt-db");

describe("French from scratch catalog", () => {
  const series = OFFICIAL_PACKS.filter((pack) => pack.languageGroupId === "frenchFromZero");

  it("retires the legacy course while retaining metadata for owners and backups", () => {
    const slug = "fiszki_francuski_podstawowe_poprawione";
    expect(OFFICIAL_PACKS.find((pack) => pack.slug === slug)).toMatchObject({ retired: true, packVersion: 1 });
    expect(OFFICIAL_COURSE_AVAILABILITY.pl).toContain(slug);
    expect(buildPacks.some((pack: { slug: string }) => pack.slug === slug)).toBe(false);
  });

  it("registers three ordered French to Polish stages with matching build metadata", () => {
    expect(series.map((pack) => pack.slug)).toEqual([
      "fr_to_pl_first_50", "fr_to_pl_first_150", "fr_to_pl_first_332",
    ]);
    expect(series.map((pack) => pack.position)).toEqual([1, 2, 3]);
    for (const [index, pack] of series.entries()) {
      expect(pack.sourceLang).toBe("fr");
      expect(pack.targetLang).toBe("pl");
      expect(OFFICIAL_COURSE_AVAILABILITY.pl).toContain(pack.slug);
      expect(OFFICIAL_COURSE_AVAILABILITY.en).not.toContain(pack.slug);
      const buildPack = buildPacks.find((candidate: { slug: string }) => candidate.slug === pack.slug);
      expect(buildPack).toMatchObject({
        name: pack.name, packVersion: pack.packVersion,
        defaultFlip: pack.defaultFlip, reviewsEnabled: pack.reviewsEnabled,
      });
      expect(readCardsFromCsv(buildPack)).toHaveLength([50, 150, 332][index]);
    }
  });

  it("keeps earlier vocabulary and stable IDs in each larger stage", () => {
    let previous: { externalId: string; frontText: string; backText: string }[] = [];
    for (const pack of series) {
      const cards = readCardsFromCsv(buildPacks.find((candidate: { slug: string }) => candidate.slug === pack.slug));
      const byId = new Map(cards.map((card: { externalId: string }) => [card.externalId, card]));
      for (const card of previous) {
        expect(byId.get(card.externalId)).toEqual(expect.objectContaining({
          frontText: card.frontText, backText: card.backText,
        }));
      }
      previous = cards;
    }
  });

  it("maps all starter images and keeps later stages text only", () => {
    expect(series[0].imageMap).toBe(imageMaps.englishA1);
    for (const [index, pack] of series.entries()) {
      const cards = readCardsFromCsv(buildPacks.find((candidate: { slug: string }) => candidate.slug === pack.slug));
      const images = cards.flatMap((card: { imageFront: string | null; imageBack: string | null }) => [card.imageFront, card.imageBack]).filter(Boolean);
      expect(images).toHaveLength(index === 0 ? 50 : 0);
      for (const name of images) {
        expect(Object.prototype.hasOwnProperty.call(pack.imageMap, name)).toBe(true);
      }
    }
    expect(series.slice(1).every((pack) => pack.imageMap == null)).toBe(true);
  });

  it("provides group labels and descriptions in both UI languages", () => {
    expect(LANGUAGE_COURSE_GROUPS.frenchFromZero.labelKey).toBe("constants.languageCourseGroups.label.frenchFromZero");
    for (const locale of [pl, en]) {
      expect(locale.constants.languageCourseGroups.label.frenchFromZero).toBeTruthy();
      expect(locale.constants.languageCourseGroups.description.frenchFromZero).toBeTruthy();
    }
  });
});
