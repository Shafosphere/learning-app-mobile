import { OFFICIAL_PACKS } from "../officialPacks";

describe("official course letter hint defaults", () => {
  it.each(["en", "es", "fr"])("enables standard hints for %s language courses", (language) => {
    const courses = OFFICIAL_PACKS.filter((pack) =>
      !pack.retired && pack.sourceLang === language && pack.targetLang !== language
    );
    expect(courses.length).toBeGreaterThan(0);
    for (const course of courses) {
      expect(course.settings?.letterHintSettings).toEqual({
        enabled: true, profile: "standard", boxOneLimit: 2, boxTwoLimit: 1,
      });
    }
  });

  it("keeps hints unset for knowledge courses", () => {
    const courses = OFFICIAL_PACKS.filter((pack) => pack.categoryId != null);
    expect(courses.length).toBeGreaterThan(0);
    for (const course of courses) {
      expect(course.settings?.letterHintSettings).toBeUndefined();
    }
  });
});
