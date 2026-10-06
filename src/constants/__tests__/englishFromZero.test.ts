/* eslint-disable @typescript-eslint/no-require-imports */
import { OFFICIAL_PACKS } from "../officialPacks";
import { OFFICIAL_COURSE_AVAILABILITY } from "../officialCourseAvailability";
import { imageMaps } from "../imageMaps";
import { LANGUAGE_COURSE_GROUPS } from "../languageCourseGroups";
import pl from "@/src/locales/pl.json";
import en from "@/src/locales/en.json";

const { OFFICIAL_PACKS: buildPacks, readCardsFromCsv } = require("../../../tools/scripts/build-prebuilt-db");

describe("English from scratch catalog", () => {
  const series = OFFICIAL_PACKS.filter((pack) => pack.languageGroupId === "englishFromZero");

  it("keeps the legacy course discoverable only for owners, outside the fresh-install database", () => {
    const slug = "fiszki_podstawy_en_pl_slowa";
    expect(OFFICIAL_PACKS.find((pack) => pack.slug === slug)).toMatchObject({ retired: true });
    expect(OFFICIAL_COURSE_AVAILABILITY.pl).toContain(slug);
    expect(buildPacks.some((pack: { slug: string }) => pack.slug === slug)).toBe(false);
  });

  it("keeps all five stages ordered in Languages, with matching build metadata", () => {
    expect(series.map((pack) => pack.slug)).toEqual([
      "eng_to_pl_first_50", "eng_to_pl_first_100", "eng_to_pl_first_250", "eng_to_pl_first_500", "eng_to_pl_a1",
    ]);
    expect(series.map((pack) => pack.position)).toEqual([1, 2, 3, 4, 5]);
    for (const pack of series) {
      expect(pack.categoryId).toBeUndefined();
      expect(pack.sourceLang).toBe("en");
      expect(pack.targetLang).toBe("pl");
      expect(OFFICIAL_COURSE_AVAILABILITY.pl).toContain(pack.slug);
      const buildPack = buildPacks.find((candidate: { slug: string }) => candidate.slug === pack.slug);
      expect(buildPack).toMatchObject({
        name: pack.name, packVersion: pack.packVersion,
        defaultFlip: pack.defaultFlip, reviewsEnabled: pack.reviewsEnabled,
      });
    }
    expect(series[4].packVersion).toBe(3);
    expect(OFFICIAL_PACKS.filter((pack) => ["eng_to_pl_a2", "eng_to_pl_b1", "eng_to_pl_b2"].includes(pack.slug))
      .every((pack) => pack.languageGroupId == null)).toBe(true);
  });

  it("maps every starter image without enabling images on later stages", () => {
    expect(series[0].imageMap).toBe(imageMaps.englishA1);
    expect(Object.keys(imageMaps.englishA1)).toHaveLength(50);
    const cards = readCardsFromCsv(buildPacks.find((pack: { slug: string }) => pack.slug === series[0].slug));
    for (const card of cards) expect(Object.prototype.hasOwnProperty.call(series[0].imageMap, card.imageFront)).toBe(true);
    expect(series.slice(1).every((pack) => pack.imageMap == null)).toBe(true);
  });

  it("provides the series copy in both UI languages", () => {
    expect(LANGUAGE_COURSE_GROUPS.englishFromZero.labelKey).toBe("constants.languageCourseGroups.label.englishFromZero");
    for (const locale of [pl, en]) {
      expect(locale.constants.languageCourseGroups.label.englishFromZero).toBeTruthy();
      expect(locale.constants.languageCourseGroups.description.englishFromZero).toBeTruthy();
    }
  });
});
