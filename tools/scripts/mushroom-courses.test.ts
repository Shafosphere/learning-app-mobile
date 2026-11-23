/* eslint-disable @typescript-eslint/no-require-imports */
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { OFFICIAL_PACKS as runtimePacks } from "../../src/constants/officialPacks";
import { filterCoursesForNativeLanguage } from "../../src/features/courses/courseVisibility";
import { buildImageAttributions } from "./build-image-attributions";

const { OFFICIAL_PACKS, readCardsFromCsv } = require("./build-prebuilt-db");
const slugs = ["grzyby_podstawowe", "grzyby_rozpoznawanie"];
const read = (slug: string) => readCardsFromCsv(OFFICIAL_PACKS.find((pack: { slug: string }) => pack.slug === slug));
const basic = read(slugs[0]);
const recognition = read(slugs[1]);
const find = (cards: typeof recognition, id: string) => cards.find((card: { externalId: string }) => card.externalId === id);

it("ships the Polish identification course with its images", () => {
  const courses = slugs.map((slug, id) => ({ id: id + 1, slug, name: slug }));
  expect(filterCoursesForNativeLanguage(courses, "pl", [])).toEqual(courses);
  expect(filterCoursesForNativeLanguage(courses, "en", [])).toEqual([]);
  expect(recognition).toHaveLength(50);
  const images = JSON.parse(fs.readFileSync("Content/packs/images/mushrooms.json", "utf8"));
  const generatedCourses = JSON.parse(fs.readFileSync("Content/runtime/generated/courses.json", "utf8"));
  expect(Object.keys(images.files)).toHaveLength(50);
  for (const slug of slugs) {
    expect(runtimePacks.find(pack => pack.slug === slug)?.requiredImagePacks).toEqual(["images_mushrooms"]);
    expect(generatedCourses[slug]).toEqual(["images_mushrooms"]);
  }
  expect(new Set(recognition.map((card: { externalId: string }) => card.externalId)).size).toBe(50);
  [...basic, ...recognition].forEach((card: { externalId: string; imageFront: string; type: string; flipped: boolean; explanation: string | null }) => {
    expect(card.type).toBe("text");
    expect(card.flipped).toBe(false);
    expect(card.explanation).toBeNull();
    expect(card.imageFront).toMatch(/^asset:\/\/images_mushrooms\//);
    const file = card.imageFront.replace("asset://images_mushrooms/", "");
    expect(fs.statSync(path.resolve(images.files[file])).size).toBeGreaterThan(1000);
  });
});

it("accepts source name variants except explicitly corrected taxonomy", () => {
  const source = Papa.parse<Record<string, string>>(fs.readFileSync("tools/kurs_1_rozpoznawanie_grzybow.csv", "utf8"), { header: true, skipEmptyLines: true }).data;
  for (const row of source) {
    const card = find(recognition, row.id);
    expect(card.answers).toContain(row.nazwa_lacinska);
    if (!["grzyb_032", "grzyb_038"].includes(row.id)) {
      for (const name of [row.nazwa_potoczna, row.nazwa_polska]) expect(card.answers).toContain(name);
    }
  }
  expect(find(recognition, "grzyb_032").answers).toEqual(["Zasłonak rudawy", "Cortinarius rubellus"]);
  expect(find(recognition, "grzyb_038").answers).toEqual(["Zasłonak rudy", "Cortinarius orellanus"]);
});

it("exposes the image credits for both progressive stages", () => {
  const courses = buildImageAttributions().filter(course => slugs.includes(course.id));
  expect(courses).toHaveLength(2);
  for (const [index, slug] of slugs.entries()) {
    const credits = courses.find(course => course.id === slug)!.attributions;
    expect(credits).toHaveLength(index === 0 ? 20 : 50);
    expect(credits.every(credit => credit.author && credit.sourceUrl && credit.license)).toBe(true);
  }
});

it("starts with the requested 20 species in order and includes them unchanged in the full stage", () => {
  const expectedIds = [29, 1, 3, 2, 28, 4, 5, 11, 8, 6, 12, 13, 18, 7, 17, 34, 16, 10, 20, 44]
    .map(id => `grzyb_${String(id).padStart(3, "0")}`);
  expect(basic.map((card: { externalId: string }) => card.externalId)).toEqual(expectedIds);
  for (const card of basic) {
    expect(find(recognition, card.externalId)).toEqual(expect.objectContaining({
      externalId: card.externalId, imageFront: card.imageFront, answers: card.answers, explanation: null,
    }));
  }
  const stages = runtimePacks.filter(pack => pack.knowledgeGroupId === "mushrooms")
    .sort((a, b) => a.position! - b.position!);
  expect(stages.map(pack => pack.slug)).toEqual(slugs);
  for (const stage of stages) {
    expect(OFFICIAL_PACKS.find((pack: { slug: string }) => pack.slug === stage.slug))
      .toMatchObject({ name: stage.name, packVersion: stage.packVersion });
  }
});
