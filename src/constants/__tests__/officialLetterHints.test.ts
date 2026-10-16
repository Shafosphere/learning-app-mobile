import { OFFICIAL_PACKS } from "../officialPacks";

describe("official image role defaults", () => {
  it("uses image recall only for the five illustrated 50-word packs", () => {
    expect(OFFICIAL_PACKS.filter((pack) => pack.settings?.frontImageRole !== undefined).map((pack) => pack.slug).sort()).toEqual([
      "eng_to_pl_first_50", "es_to_en_first_50", "es_to_pl_first_50", "fr_to_en_first_50", "fr_to_pl_first_50",
    ]);
    for (const pack of OFFICIAL_PACKS.filter((pack) => pack.settings?.frontImageRole !== undefined)) {
      expect(pack.settings?.frontImageRole).toBe("replace_back");
    }
  });
});

describe("official course letter hint defaults", () => {
  const enabledSlugs = [
    "eng_to_pl_first_50", "eng_to_pl_first_100", "eng_to_pl_first_250",
    "es_to_pl_first_50", "es_to_pl_first_150",
    "es_to_en_first_50", "es_to_en_first_150",
    "fr_to_pl_first_50", "fr_to_pl_first_150",
    "fr_to_en_first_50", "fr_to_en_first_150",
  ];

  it.each(enabledSlugs)("enables standard hints for %s", (slug) => {
    expect(OFFICIAL_PACKS.find((pack) => pack.slug === slug)?.settings?.letterHintSettings).toEqual({
      enabled: true, profile: "standard", boxOneLimit: 2, boxTwoLimit: 1,
    });
  });

  it("keeps hints unset for all other packs, including higher levels and retired packs", () => {
    for (const pack of OFFICIAL_PACKS.filter((pack) => !enabledSlugs.includes(pack.slug))) {
      expect(pack.settings?.letterHintSettings).toBeUndefined();
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
