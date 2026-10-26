/* eslint-disable @typescript-eslint/no-require-imports */
import { OFFICIAL_PACKS } from "../officialPacks";
import { OFFICIAL_COURSE_AVAILABILITY } from "../officialCourseAvailability";
import { filterCoursesForNativeLanguage } from "@/src/features/courses/courseVisibility";

const { OFFICIAL_PACKS: buildPacks } = require("../../../tools/scripts/build-prebuilt-db");

describe("retired mathematics course", () => {
  it("preserves metadata for owners while excluding the course from new installations", () => {
    expect(OFFICIAL_PACKS.find((pack) => pack.slug === "math")).toMatchObject({
      retired: true,
      packVersion: 1,
    });
    expect(buildPacks.some((pack: { slug: string }) => pack.slug === "math")).toBe(false);
    for (const slugs of Object.values(OFFICIAL_COURSE_AVAILABILITY)) {
      expect(slugs).not.toContain("math");
    }
  });

  it.each(["pl", "en"] as const)("keeps mathematics visible only while pinned in %s", (language) => {
    const courses = [{ id: 27, slug: "math" }];
    expect(filterCoursesForNativeLanguage(courses, language, [])).toEqual([]);
    expect(filterCoursesForNativeLanguage(courses, language, [27])).toEqual(courses);
  });
});
