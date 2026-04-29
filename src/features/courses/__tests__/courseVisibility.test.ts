import { filterCoursesForNativeLanguage } from "../courseVisibility";

describe("filterCoursesForNativeLanguage", () => {
  const courses = [
    { id: 1, name: "PL course", slug: "pl_course" },
    { id: 2, name: "EN course", slug: "en_course" },
    { id: 3, name: "Other PL course", slug: "other_pl_course" },
    { id: 4, name: "Missing slug course", slug: null },
  ];
  const availability = {
    pl: ["pl_course", "other_pl_course"],
    en: ["en_course"],
  };

  it("shows courses for Polish native language", () => {
    expect(
      filterCoursesForNativeLanguage(courses, "pl", [], availability)
    ).toEqual([courses[0], courses[2]]);
  });

  it("shows courses for English native language", () => {
    expect(
      filterCoursesForNativeLanguage(courses, "en", [], availability)
    ).toEqual([courses[1]]);
  });

  it("keeps pinned courses visible outside native language", () => {
    expect(
      filterCoursesForNativeLanguage(courses, "en", [1], availability)
    ).toEqual([courses[0], courses[1]]);
  });

  it("keeps pinned courses visible even when slug is missing", () => {
    expect(
      filterCoursesForNativeLanguage(courses, "en", [4], availability)
    ).toEqual([courses[1], courses[3]]);
  });
});
