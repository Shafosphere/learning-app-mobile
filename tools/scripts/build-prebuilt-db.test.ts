/* eslint-disable @typescript-eslint/no-require-imports */
// Production script is CommonJS so Node can execute it directly during prebuild.
const {
  OFFICIAL_PACKS,
  parseCardsFromCsv,
  readCardsFromCsv,
  splitBackTextIntoAnswers,
} = require("./build-prebuilt-db");

const EXPECTED_CARD_COUNTS: Record<string, number> = {
  eng_to_pl_a1: 1061,
  eng_to_pl_a2: 1230,
  eng_to_pl_b1: 2020,
  eng_to_pl_b2: 1736,
  fiszki_podstawy_en_pl_slowa: 474,
  fiszki_hiszpanski_podstawowe_poprawione: 310,
  fiszki_francuski_podstawowe_poprawione: 309,
  basic_english_to_spanish_50: 310,
  astronomia: 107,
  polska_historia: 144,
  math: 258,
  grecka_mitologia_prawda_falsz_50: 50,
  znaki_drogowe: 165,
  flagi_europy: 52,
  flagi_afryki: 55,
  flagi_azji: 50,
  flagi_ameryki: 49,
  flagi_oceanii: 28,
  flagi_swiata: 235,
  panstwa_i_stolice_europy: 47,
  panstwa_i_stolice_afryki: 54,
  panstwa_i_stolice_azji: 49,
  panstwa_i_stolice_ameryki: 35,
  panstwa_i_stolice_oceanii: 16,
  panstwa_i_stolice_swiata: 197,
  flagi_europy_en: 52,
  flagi_afryki_en: 55,
  flagi_azji_en: 50,
  flagi_ameryki_en: 49,
  flagi_oceanii_en: 28,
  flagi_swiata_en: 235,
  panstwa_i_stolice_europy_en: 47,
  panstwa_i_stolice_afryki_en: 54,
  panstwa_i_stolice_azji_en: 49,
  panstwa_i_stolice_ameryki_en: 35,
  panstwa_i_stolice_oceanii_en: 16,
  panstwa_i_stolice_swiata_en: 197,
};

describe("prebuilt CSV parser", () => {
  it("keeps front_text intact while splitting back_text answers", () => {
    const [card] = parseCardsFromCsv(
      {
        csvFile: "synthetic.csv",
        defaultType: "traditional",
        defaultFlip: true,
      },
      [
        "external_id,front_text,back_text",
        '001,"one, first; primary","jeden, pierwsza; podstawowy"',
      ].join("\n")
    );

    expect(card.frontText).toBe("one, first; primary");
    expect(card.answers).toEqual(["jeden", "pierwsza", "podstawowy"]);
    expect(card.backText).toBe("jeden; pierwsza; podstawowy");
  });

  it("preserves traditional type and resolves flip overrides", () => {
    const cards = parseCardsFromCsv(
      {
        csvFile: "traditional.csv",
        defaultType: "traditional",
        defaultFlip: true,
      },
      [
        "external_id,front_text,back_text,flip",
        "001,one,jeden,",
        "002,two,dwa,false",
      ].join("\n")
    );

    expect(cards).toEqual([
      expect.objectContaining({
        type: "text",
        flipped: true,
        answerOnly: false,
      }),
      expect.objectContaining({
        type: "text",
        flipped: false,
        answerOnly: false,
      }),
    ]);
  });

  it("maps true/false and self-assessment cards without changing semantics", () => {
    const trueFalse = parseCardsFromCsv(
      {
        csvFile: "true-false.csv",
        defaultType: "true_false",
        defaultFlip: true,
      },
      "external_id,front_text,tf_answer\n001,Sky is blue,true"
    )[0];
    const selfAssess = parseCardsFromCsv(
      {
        csvFile: "self-assess.csv",
        defaultType: "self_assess",
        defaultFlip: true,
      },
      "external_id,front_text,back_text\n001,Explain gravity,Attraction between masses"
    )[0];

    expect(trueFalse).toEqual(
      expect.objectContaining({
        type: "true_false",
        answers: ["true"],
        flipped: true,
        answerOnly: false,
      })
    );
    expect(selfAssess).toEqual(
      expect.objectContaining({
        type: "know_dont_know",
        answers: [],
        explanation: "Attraction between masses",
        flipped: false,
        answerOnly: true,
      })
    );
  });

  it("throws with file and row context when external_id is missing", () => {
    expect(() =>
      parseCardsFromCsv(
        {
          csvFile: "missing-id.csv",
          defaultType: "traditional",
          defaultFlip: false,
        },
        "external_id,front_text,back_text\n,one,jeden"
      )
    ).toThrow(
      'Missing external_id in official pack CSV "missing-id.csv" at row 2'
    );
  });

  it("uses same answer splitting contract as runtime parser", () => {
    expect(splitBackTextIntoAnswers(" one, two; one\nthree ")).toEqual([
      "one",
      "two",
      "three",
    ]);
  });
});

describe("registered prebuilt CSV packs", () => {
  it("keeps registered pack inventory and card counts stable", () => {
    expect(OFFICIAL_PACKS).toHaveLength(37);
    expect(Object.keys(EXPECTED_CARD_COUNTS)).toHaveLength(37);

    const actualCounts = Object.fromEntries(
      OFFICIAL_PACKS.map((pack: { slug: string }) => [
        pack.slug,
        readCardsFromCsv(pack).length,
      ])
    );

    expect(actualCounts).toEqual(EXPECTED_CARD_COUNTS);
    expect(
      Object.values(actualCounts).reduce(
        (total: number, count) => total + (count as number),
        0
      )
    ).toBe(9908);
  });

  it.each(OFFICIAL_PACKS.map((pack: { slug: string }) => [pack.slug, pack]))(
    "%s has unique stable IDs and usable card content",
    (_slug: string, pack: Record<string, unknown>) => {
      const cards = readCardsFromCsv(pack);
      const externalIds = cards.map(
        (card: { externalId: string }) => card.externalId
      );

      expect(cards.length).toBeGreaterThan(0);
      expect(externalIds.every((id: string) => id.trim().length > 0)).toBe(true);
      expect(new Set(externalIds).size).toBe(externalIds.length);

      for (const card of cards) {
        const hasPrompt =
          card.frontText.trim().length > 0 || card.imageFront != null;
        const hasAnswer =
          card.answers.length > 0 ||
          card.imageBack != null ||
          card.explanation != null;

        expect(hasPrompt).toBe(true);
        expect(hasAnswer).toBe(true);
      }
    }
  );
});
