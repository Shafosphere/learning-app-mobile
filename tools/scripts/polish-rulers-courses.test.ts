/* eslint-disable @typescript-eslint/no-require-imports */
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { OFFICIAL_PACKS as runtimePacks } from "../../src/constants/officialPacks";
import { filterCoursesForNativeLanguage } from "../../src/features/courses/courseVisibility";
import { resolveCourseSettingsDefaults } from "../../src/contexts/settings/courseSettingsDefaults";
import { buildImageAttributions } from "./build-image-attributions";

const { OFFICIAL_PACKS, readCardsFromCsv } = require("./build-prebuilt-db");
const slugs = ["wladcy_polski_portrety", "wladcy_polski_portrety_daty", "wladcy_polski_daty"];
const source = Papa.parse<Record<string, string>>(fs.readFileSync("tools/wladcy_polski.csv", "utf8"), { header: true, skipEmptyLines: true }).data
  .sort((a, b) => Number(a.kolejnosc_pierwszego_objecia_wladzy) - Number(b.kolejnosc_pierwszego_objecia_wladzy));
const cards = slugs.map(slug => readCardsFromCsv(OFFICIAL_PACKS.find((pack: { slug: string }) => pack.slug === slug)));
const imagePack = JSON.parse(fs.readFileSync("Content/packs/images/polish-rulers.json", "utf8"));

it("ships three Polish courses with matching manifests and independent progress", () => {
  const courses = slugs.map((slug, id) => ({ id: id + 1, slug, name: slug }));
  expect(filterCoursesForNativeLanguage(courses, "pl", [])).toEqual(courses);
  expect(filterCoursesForNativeLanguage(courses, "en", [])).toEqual([]);
  const group = runtimePacks.filter(pack => pack.knowledgeGroupId === "polishRulers").sort((a, b) => a.position! - b.position!);
  expect(group.map(pack => pack.slug)).toEqual(slugs);
  for (const pack of group) {
    expect(OFFICIAL_PACKS.find((entry: { slug: string }) => entry.slug === pack.slug)).toMatchObject({ name: pack.name, packVersion: pack.packVersion, defaultFlip: false });
    expect(resolveCourseSettingsDefaults(pack)).toMatchObject({ reviewsEnabled: true, showExplanationEnabled: true, explanationOnlyOnWrong: false, frontImageRole: "standard", audioSettings: { enabled: false } });
  }
});

it("preserves chronology and filters dates using the source flag", () => {
  expect(cards.map(course => course.length)).toEqual([48, 48, 29]);
  const ids = source.map(row => row.id);
  expect(cards[0].map((card: { externalId: string }) => card.externalId)).toEqual(ids);
  expect(cards[1].map((card: { externalId: string }) => card.externalId)).toEqual(ids);
  expect(cards[2].map((card: { externalId: string }) => card.externalId)).toEqual(source.filter(row => row.fiszka_dat_panowania_bez_uwag === "True").map(row => row.id));
  expect(new Set(cards[2].map((card: { frontText: string }) => card.frontText)).size).toBe(29);
  for (const course of cards) expect(new Set(course.map((card: { externalId: string }) => card.externalId)).size).toBe(course.length);
});

it("accepts full names and source aliases, preserves date variants, and explains multi-period reigns", () => {
  for (const [variant, course] of cards.entries()) for (const card of course) {
    const row = source.find(row => row.id === card.externalId)!;
    expect(card.type).toBe("text");
    expect(card.flipped).toBe(false);
    expect(card.answerOnly).toBe(false);
    expect(card.answers).toEqual([...new Set([row.nazwa, ...row.aliasy.split(";")].map(name => name.trim()).filter(Boolean))]);
    expect(card.frontText).toBe(variant === 0 ? "" : row.lata_panowania);
    for (const answer of card.answers) expect(card.frontText).not.toContain(answer);
    const periods = row.lata_panowania.split(";").map(period => period.trim()).filter(Boolean);
    expect(card.explanation).toBe(periods.length > 1 ? `Pełne lata panowania: ${periods.join(" oraz ")}.` : null);
  }
  expect(cards[1].find((card: { externalId: string }) => card.externalId === "mieszko-i").frontText).toBe("ok. 960–992");
  expect(cards[1].find((card: { externalId: string }) => card.externalId === "mieszko-ii-lambert").frontText).toBe("1025–1031; 1032–1034");
  expect(cards[1].find((card: { externalId: string }) => card.externalId === "mieszko-ii-lambert").explanation).toBe("Pełne lata panowania: 1025–1031 oraz 1032–1034.");
  expect(cards[0].find((card: { externalId: string }) => card.externalId === "boleslaw-i-chrobry").answers).not.toContain("Bolesław");
});

it("shares one complete WebP pack while the dates-only course needs no download", () => {
  const dependencies = JSON.parse(fs.readFileSync("Content/runtime/generated/courses.json", "utf8"));
  expect(Object.keys(imagePack.files)).toHaveLength(48);
  for (let index = 0; index < 2; index++) {
    expect(runtimePacks.find(pack => pack.slug === slugs[index])?.requiredImagePacks).toEqual(["images_polish_rulers"]);
    expect(dependencies[slugs[index]]).toEqual(["images_polish_rulers"]);
    for (const card of cards[index]) {
      expect(card.imageFront).toBe(`asset://images_polish_rulers/${card.externalId}.webp`);
      const bytes = fs.readFileSync(path.resolve(imagePack.files[`${card.externalId}.webp`]));
      expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
      expect(bytes.toString("ascii", 8, 12)).toBe("WEBP");
    }
  }
  expect(runtimePacks.find(pack => pack.slug === slugs[2])?.requiredImagePacks).toBeUndefined();
  expect(dependencies[slugs[2]]).toBeUndefined();
  expect(cards[2].every((card: { imageFront: null; imageBack: null }) => card.imageFront === null && card.imageBack === null)).toBe(true);
});

it("provides verified credits tied to the reviewed source revisions for both image courses", () => {
  const metadata = JSON.parse(fs.readFileSync("tools/scripts/data/polish-rulers/commons-metadata.json", "utf8"));
  const reviews = JSON.parse(fs.readFileSync("tools/scripts/data/polish-rulers/image-reviews.json", "utf8"));
  const credits = buildImageAttributions().filter(course => slugs.includes(course.id));
  expect(credits.map(course => course.id)).toEqual(slugs.slice(0, 2));
  for (const course of credits) {
    expect(course.attributions).toHaveLength(48);
    for (const credit of course.attributions) {
      expect(credit.scientificName).toBeUndefined();
      expect(credit.license).toBe("Public domain");
      expect(credit.sourceUrl).toBe(metadata[credit.id].descriptionurl);
      expect(credit.author).toBe(reviews[credit.id].author);
      expect(credit.changes.pl).toContain("WebP");
      expect(credit.changes.en).toContain("Preserved aspect ratio");
      expect(reviews[credit.id]).toMatchObject({ checked: true, sourceTitle: metadata[credit.id].title, sourceSha1: metadata[credit.id].sha1 });
    }
  }
  expect(credits[0].attributions.find(credit => credit.id === "henryk-iv-probus")?.author).toBe("Bartłomiej Strachowski");
});
