import { analyzeRows } from "./analyzeRows";
import { parseCsvText } from "./parseFile";
import { normalizeCsvHeaderKey } from "./schema";
import { getCsvTemplate } from "./templates";
import type { ParsedCsvInput } from "./types";

const makeParsedInput = (
  rows: ParsedCsvInput["rows"],
  headers: string[]
): ParsedCsvInput => ({
  source: "csv",
  fileName: "test.csv",
  rows,
  headers,
  parseIssues: [],
  resolveImage: async () => null,
});

const analyzeCsv = (csvText: string, locale: "pl" | "en" = "pl") => {
  const parsed = parseCsvText(csvText);
  return analyzeRows(
    {
      source: "csv",
      fileName: "guide-example.csv",
      rows: parsed.rows,
      headers: parsed.headers,
      parseIssues: parsed.parseIssues,
      resolveImage: async () => null,
    },
    { locale }
  );
};

describe("custom course CSV import", () => {
  it("uses czy_prawda as the Polish true/false answer column", () => {
    expect(normalizeCsvHeaderKey("czy_prawda")).toBe("tf_answer");
    expect(normalizeCsvHeaderKey("odpowiedz_tf")).toBe("tf_answer");
  });

  it("maps preferred Polish question and answer columns", () => {
    expect(normalizeCsvHeaderKey("pytanie")).toBe("front_text");
    expect(normalizeCsvHeaderKey("odpowiedz")).toBe("back_text");
    expect(normalizeCsvHeaderKey("odpowiedź")).toBe("back_text");
  });

  it("maps preferred English question and answer columns", () => {
    expect(normalizeCsvHeaderKey("question")).toBe("front_text");
    expect(normalizeCsvHeaderKey("answer")).toBe("back_text");
  });

  it("imports Polish true/false values", () => {
    const result = analyzeRows(
      makeParsedInput(
        [
          {
            rowNumber: 2,
            raw: {
              front_text: "Slonce jest gwiazda",
              tf_answer: "prawda",
            },
          },
          {
            rowNumber: 3,
            raw: {
              front_text: "Woda wrze w 10 C",
              tf_answer: "falsz",
            },
          },
        ],
        ["front_text", "tf_answer"]
      ),
      { locale: "pl" }
    );

    expect(result.invalidRowsCount).toBe(0);
    expect(result.validRows).toMatchObject([
      { mappedType: "true_false", tfAnswer: true },
      { mappedType: "true_false", tfAnswer: false },
    ]);
  });

  it("imports a front-only CSV as self-assessment cards", () => {
    const result = analyzeRows(
      makeParsedInput(
        [
          {
            rowNumber: 2,
            raw: {
              front_text: "Wzor na pole kola",
            },
          },
          {
            rowNumber: 3,
            raw: {
              front_text: "II zasada dynamiki Newtona",
              explanation: "F = m * a",
            },
          },
        ],
        ["front_text", "explanation"]
      ),
      { locale: "pl" }
    );

    expect(result.invalidRowsCount).toBe(0);
    expect(result.statsByType.self_assess).toBe(2);
    expect(result.validRows).toMatchObject([
      { mappedType: "know_dont_know", frontText: "Wzor na pole kola" },
      {
        mappedType: "know_dont_know",
        frontText: "II zasada dynamiki Newtona",
        explanation: "F = m * a",
      },
    ]);
  });

  it("infers empty back_text rows as self-assessment even when the header exists", () => {
    const result = analyzeRows(
      makeParsedInput(
        [
          {
            rowNumber: 2,
            raw: {
              front_text: "Wzor na pole kola",
              back_text: "",
            },
          },
          {
            rowNumber: 3,
            raw: {
              front_text: "II zasada dynamiki Newtona",
              back_text: "   ",
            },
          },
        ],
        ["front_text", "back_text"]
      ),
      { locale: "pl" }
    );

    expect(result.invalidRowsCount).toBe(0);
    expect(result.statsByType.self_assess).toBe(2);
    expect(result.statsByType.traditional).toBe(0);
    expect(result.validRows).toMatchObject([
      { mappedType: "know_dont_know", frontText: "Wzor na pole kola" },
      {
        mappedType: "know_dont_know",
        frontText: "II zasada dynamiki Newtona",
      },
    ]);
  });

  it("infers mixed back_text rows independently by row value", () => {
    const result = analyzeRows(
      makeParsedInput(
        [
          {
            rowNumber: 2,
            raw: {
              front_text: "Capital of Poland",
              back_text: "Warsaw",
            },
          },
          {
            rowNumber: 3,
            raw: {
              front_text: "Explain Newton's second law",
              back_text: "",
              explanation: "F = m * a",
            },
          },
        ],
        ["front_text", "back_text", "explanation"]
      ),
      { locale: "en" }
    );

    expect(result.invalidRowsCount).toBe(0);
    expect(result.statsByType.traditional).toBe(1);
    expect(result.statsByType.self_assess).toBe(1);
    expect(result.validRows).toMatchObject([
      { mappedType: "text", frontText: "Capital of Poland", backText: "Warsaw" },
      {
        mappedType: "know_dont_know",
        frontText: "Explain Newton's second law",
        explanation: "F = m * a",
      },
    ]);
  });

  it("imports guide example awers,wyjasnienie as self-assessment cards", () => {
    const result = analyzeCsv(
      ["awers,wyjasnienie", "Wzor na pole kola,Pi razy r do kwadratu"].join("\n")
    );

    expect(result.invalidRowsCount).toBe(0);
    expect(result.statsByType.self_assess).toBe(1);
    expect(result.validRows).toMatchObject([
      {
        type: "self_assess",
        mappedType: "know_dont_know",
        frontText: "Wzor na pole kola",
        explanation: "Pi razy r do kwadratu",
      },
    ]);
  });

  it("imports guide example awers as self-assessment cards", () => {
    const result = analyzeCsv(["awers", "Prawo Ohma"].join("\n"));

    expect(result.invalidRowsCount).toBe(0);
    expect(result.statsByType.self_assess).toBe(1);
    expect(result.validRows).toMatchObject([
      {
        type: "self_assess",
        mappedType: "know_dont_know",
        frontText: "Prawo Ohma",
      },
    ]);
  });

  it("imports guide example awers,rewers as text-answer cards", () => {
    const result = analyzeCsv(["awers,rewers", "Stolica Polski,Warszawa"].join("\n"));

    expect(result.invalidRowsCount).toBe(0);
    expect(result.statsByType.traditional).toBe(1);
    expect(result.validRows).toMatchObject([
      {
        type: "traditional",
        mappedType: "text",
        frontText: "Stolica Polski",
        backText: "Warszawa",
      },
    ]);
  });

  it("imports preferred Polish pytanie,odpowiedz as text-answer cards", () => {
    const result = analyzeCsv(
      ["pytanie,odpowiedz", "Stolica Polski,Warszawa"].join("\n")
    );

    expect(result.invalidRowsCount).toBe(0);
    expect(result.statsByType.traditional).toBe(1);
    expect(result.validRows).toMatchObject([
      {
        type: "traditional",
        mappedType: "text",
        frontText: "Stolica Polski",
        backText: "Warszawa",
      },
    ]);
  });

  it("imports preferred English question,answer as text-answer cards", () => {
    const result = analyzeCsv(
      ["question,answer", "Capital of Poland,Warsaw"].join("\n"),
      "en"
    );

    expect(result.invalidRowsCount).toBe(0);
    expect(result.statsByType.traditional).toBe(1);
    expect(result.validRows).toMatchObject([
      {
        type: "traditional",
        mappedType: "text",
        frontText: "Capital of Poland",
        backText: "Warsaw",
      },
    ]);
  });

  it("imports guide example awers,rewers,wyjasnienie,odwroc as flipped text-answer cards", () => {
    const result = analyzeCsv(
      [
        "awers,rewers,wyjasnienie,odwroc",
        "Stolica Francji,Paryz,Miasto nad Sekwana,tak",
      ].join("\n")
    );

    expect(result.invalidRowsCount).toBe(0);
    expect(result.statsByType.traditional).toBe(1);
    expect(result.validRows).toMatchObject([
      {
        type: "traditional",
        mappedType: "text",
        frontText: "Stolica Francji",
        backText: "Paryz",
        explanation: "Miasto nad Sekwana",
        flip: true,
      },
    ]);
  });

  it("imports guide example awers,czy_prawda,wyjasnienie as true-false cards", () => {
    const result = analyzeCsv(
      [
        "awers,czy_prawda,wyjasnienie",
        "Slonce jest gwiazda,prawda,Gwiazda najblizsza Ziemi",
        "Woda wrze w 10 C,falsz,Przy normalnym cisnieniu wrze w 100 C",
      ].join("\n")
    );

    expect(result.invalidRowsCount).toBe(0);
    expect(result.statsByType.true_false).toBe(2);
    expect(result.validRows).toMatchObject([
      {
        type: "true_false",
        mappedType: "true_false",
        frontText: "Slonce jest gwiazda",
        tfAnswer: true,
        explanation: "Gwiazda najblizsza Ziemi",
      },
      {
        type: "true_false",
        mappedType: "true_false",
        frontText: "Woda wrze w 10 C",
        tfAnswer: false,
        explanation: "Przy normalnym cisnieniu wrze w 100 C",
      },
    ]);
  });

  it("imports guide mixed example using an initial type column", () => {
    const result = analyzeCsv(
      [
        "type,awers,rewers,czy_prawda,wyjasnienie",
        "odpowiedz_tekstowa,Bonjour,Hello,,",
        "prawda_falsz,Ziemia jest plaska,,falsz,",
        "samoocena,Wzor na pole kola,,,Pi razy r do kwadratu",
      ].join("\n")
    );

    expect(result.invalidRowsCount).toBe(0);
    expect(result.statsByType.traditional).toBe(1);
    expect(result.statsByType.true_false).toBe(1);
    expect(result.statsByType.self_assess).toBe(1);
    expect(result.validRows).toMatchObject([
      {
        type: "traditional",
        mappedType: "text",
        frontText: "Bonjour",
        backText: "Hello",
      },
      {
        type: "true_false",
        mappedType: "true_false",
        frontText: "Ziemia jest plaska",
        tfAnswer: false,
      },
      {
        type: "self_assess",
        mappedType: "know_dont_know",
        frontText: "Wzor na pole kola",
        explanation: "Pi razy r do kwadratu",
      },
    ]);
  });

  it("imports all preferred Polish type aliases", () => {
    const result = analyzeCsv(
      [
        "typ,pytanie,odpowiedz,czy_prawda,wyjasnienie",
        "odpowiedz_tekstowa,Stolica Polski,Warszawa,,",
        "prawda_falsz,Slonce jest gwiazda,,prawda,",
        "samoocena,Wzor na pole kola,,,Pi razy r do kwadratu",
      ].join("\n")
    );

    expect(result.invalidRowsCount).toBe(0);
    expect(result.statsByType).toEqual({
      traditional: 1,
      true_false: 1,
      self_assess: 1,
    });
    expect(result.validRows).toMatchObject([
      { type: "traditional", mappedType: "text" },
      { type: "true_false", mappedType: "true_false" },
      { type: "self_assess", mappedType: "know_dont_know" },
    ]);
  });

  it("treats a single-column CSV without a header as front-only rows", () => {
    const parsed = parseCsvText(
      ["Wzor na pole kola", "II zasada dynamiki Newtona", "Prawo Ohma"].join("\n")
    );

    expect(parsed.headers).toEqual(["front_text"]);
    expect(parsed.rows).toEqual([
      {
        rowNumber: 1,
        raw: { front_text: "Wzor na pole kola" },
      },
      {
        rowNumber: 2,
        raw: { front_text: "II zasada dynamiki Newtona" },
      },
      {
        rowNumber: 3,
        raw: { front_text: "Prawo Ohma" },
      },
    ]);

    const result = analyzeRows(
      {
        source: "csv",
        fileName: "test.csv",
        rows: parsed.rows,
        headers: parsed.headers,
        parseIssues: parsed.parseIssues,
        resolveImage: async () => null,
      },
      { locale: "pl" }
    );

    expect(result.statsByType.self_assess).toBe(3);
    expect(result.validRows).toHaveLength(3);
    expect(result.validRows[0]).toMatchObject({
      mappedType: "know_dont_know",
      frontText: "Wzor na pole kola",
    });
  });

  it("generates Polish templates with preferred question and answer headers", () => {
    const template = getCsvTemplate("traditional", { locale: "pl" });

    expect(template.content.split("\n")[0]).toBe(
      "typ,pytanie,odpowiedz,obraz_awers,obraz_rewers,czy_prawda,odwroc,wyjasnienie"
    );
  });

  it("generates Polish self-assessment templates with the Polish type value", () => {
    const template = getCsvTemplate("self_assess", { locale: "pl" });

    expect(template.content.split("\n")[1]?.split(",")[0]).toBe("samoocena");
    expect(template.content).not.toContain("self_assess");
  });

  it("generates English templates with preferred question and answer headers", () => {
    const template = getCsvTemplate("traditional", { locale: "en" });

    expect(template.content.split("\n")[0]).toBe(
      "type,question,answer,front_image,back_image,tf_answer,flip,explanation"
    );
  });
});
