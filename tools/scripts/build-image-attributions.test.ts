import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildImageAttributions, parseAttributionCourse } from "./build-image-attributions";
import type { AttributionCourseRegistryEntry } from "../attributions/courseRegistry.ts";

const birds: AttributionCourseRegistryEntry = {
  id: "birds", sourcePath: "tools/prebuild-data/pl/przyroda/ptaki/Ptaki_Polski_i_Europy_Srodkowej(1).tsv",
  title: { pl: "Ptaki", en: "Birds" }, defaultChanges: { pl: "Zmniejszono.", en: "Resized." },
};
const header = "nr\tnazwa_polska\tnazwa_lacinska\tnazwa_pliku\tlink_do_obrazu_i_strony_licencji\tlicencja\tautor_do_atrybucji\tlink_do_tekstu_licencji\ttytul_do_atrybucji\topis_zmian";

function fixtureCourse(rows: string) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "attribution-test-"));
  const fixture = path.join(directory, "credits.tsv");
  fs.writeFileSync(fixture, `${header}\n${rows}`);
  return { ...birds, sourcePath: path.relative(process.cwd(), fixture) };
}

describe("image attribution generator", () => {
  it("imports 50 birds, Jerzyk, and public domain", () => {
    const [course] = buildImageAttributions([birds]);
    expect(course.attributions).toHaveLength(50);
    expect(course.attributions.find((item) => item.id === "20")).toMatchObject({ commonName: "Jerzyk zwyczajny", title: "Beynac Mauersegler 1 (Apus apus)", author: "Arnoldius", license: "CC BY-SA 4.0" });
    expect(course.attributions.find((item) => item.id === "45")).toMatchObject({ license: "Public domain" });
  });

  it("uses optional title and changes", () => {
    const course = parseAttributionCourse(fixtureCourse("1\tTest\tTestus testus\tfile.jpg\thttps://example.com/source\tCC BY 4.0\tAuthor\thttps://example.com/license\tCustom title\tCustom changes"));
    expect(course.attributions[0]).toMatchObject({ title: "Custom title", changes: { pl: "Custom changes", en: "Custom changes" } });
  });

  it("allows public-domain credit without a license URL", () => {
    const course = parseAttributionCourse(fixtureCourse("1\tTest\tTestus testus\tfile.jpg\thttps://example.com/source\tPublic domain\tAuthor\t"));
    expect(course.attributions[0].licenseUrl).toBeUndefined();
  });

  it.each([
    ["1\t\tTestus\tfile.jpg\thttps://example.com/source\tCC BY 4.0\tAuthor\thttps://example.com/license", "missing required field"],
    ["1\tOne\tOne\tone.jpg\thttps://example.com/source\tCC BY 4.0\tAuthor\thttps://example.com/license\n1\tTwo\tTwo\ttwo.jpg\thttps://example.com/source\tCC BY 4.0\tAuthor\thttps://example.com/license", "duplicate nr"],
    ["1\tOne\tOne\tone.jpg\tnot-a-url\tCC BY 4.0\tAuthor\thttps://example.com/license", "invalid source URL"],
  ])("reports invalid input: %s", (rows, message) => {
    expect(() => parseAttributionCourse(fixtureCourse(rows))).toThrow(message);
  });
});
