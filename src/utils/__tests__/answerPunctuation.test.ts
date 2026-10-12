import { applyAnswerCasing, answersMatch, compareAnswerText, getAnswerGhostSuffix, getAnswerMismatchFlags, getAnswerTypoDiff } from "../answerComparison";
import { normalizeAnswerText } from "../answerNormalization";
import { convertSpanishPunctuation } from "../spanishPunctuationInput";

const tolerant = { ignoreDiacritics: false, ignoreBoundaryPunctuation: true };
const strict = { ...tolerant, ignoreBoundaryPunctuation: false };

describe("answer punctuation", () => {
  it.each(["Cómo estás", "?Cómo estás?", "¿Cómo estás?", "!!Cómo estás?!", "  ¿Cómo estás?  "])("accepts boundary variation: %s", (input) => {
    expect(answersMatch(input, "¿Cómo estás?", tolerant)).toBe(true);
    expect(getAnswerTypoDiff(input, "¿Cómo estás?", tolerant)).toBeNull();
    expect(getAnswerMismatchFlags(input, "¿Cómo estás?", tolerant).some(Boolean)).toBe(false);
  });

  it("leaves internal punctuation and accents subject to their own rules", () => {
    expect(normalizeAnswerText("¿Hola, ¿cómo estás?!", false, true)).toBe("hola, ¿cómo estás");
    expect(answersMatch("Hola cómo estás", "Hola, ¿cómo estás?", tolerant)).toBe(false);
    expect(answersMatch("Como estas", "¿Cómo estás?", tolerant)).toBe(false);
    expect(answersMatch("Como estas", "¿Cómo estás?", { ...tolerant, ignoreDiacritics: true })).toBe(true);
    expect(answersMatch("Hola", "¡Hola!", tolerant)).toBe(true);
    expect(answersMatch("Hola", "¡Hola!", strict)).toBe(false);
  });

  it("does not turn empty or punctuation-only inputs into sentence answers", () => {
    for (const input of ["", " ", "?!", "¿¡"]) expect(answersMatch(input, "¿a?", tolerant)).toBe(false);
    expect(answersMatch("?", "?", tolerant)).toBe(true);
    expect(answersMatch("", "?", tolerant)).toBe(false);
    expect(answersMatch("!", "?", tolerant)).toBe(false);
  });

  it("maps typo locations back to the original input", () => {
    expect(getAnswerTypoDiff("¿Holo?", "¡Hola!", tolerant)).toMatchObject({ index: 4, inputChar: "o", expectedChar: "a" });
    expect(getAnswerMismatchFlags("Holo", "¿Hola?", tolerant)).toEqual([false, false, false, true]);
    expect(getAnswerTypoDiff("?Hol?", "¿Hola?", tolerant)).toMatchObject({ type: "deletion", index: 4, expectedChar: "a" });
    expect(getAnswerTypoDiff("¿Holaa?", "Hola!", tolerant)).toMatchObject({ type: "insertion", index: 5, inputChar: "a" });
    expect(getAnswerTypoDiff("  ?HoLo?", "¡Hola!", tolerant)).toMatchObject({ index: 6, inputChar: "o", expectedChar: "a" });
  });

  it("keeps graphemes, Unicode normalization and whitespace aligned", () => {
    const input = " ?Co\u0301mo\u00a0  estás? ";
    const expected = "¿Cómo estás?";
    const comparison = compareAnswerText(input, expected, tolerant);
    expect(comparison.input.text).toBe(normalizeAnswerText(input, false, true));
    expect(comparison.expected.text).toBe(normalizeAnswerText(expected, false, true));
    expect(getAnswerMismatchFlags(input, expected, tolerant).some(Boolean)).toBe(false);
    expect(getAnswerTypoDiff("?👋 Holo?", "¡👋 Hola!", tolerant)).toMatchObject({ index: 7, inputChar: "o", expectedChar: "a" });
  });

  it("preserves placeholder casing around omitted or extra boundary marks", () => {
    expect(applyAnswerCasing("hola", "¿Hola?", tolerant)).toBe("Hola");
    expect(applyAnswerCasing("?hOLA?", "¡Hola!", tolerant)).toBe("?Hola?");
    expect(applyAnswerCasing("?hOLA?", "¡Hola!", strict)).toBe("?Hola?");
  });

  it("aligns ghost suffixes with the actual typed prefix", () => {
    expect(getAnswerGhostSuffix("Ho", "¿Hola?", tolerant)).toBe("la");
    expect(getAnswerGhostSuffix("?Ho", "¿Hola?", tolerant)).toBe("la");
    expect(getAnswerGhostSuffix("Hola", "¿Hola?", tolerant)).toBe("");
    expect(getAnswerGhostSuffix("", "¿Hola?", tolerant)).toBe("¿Hola?");
    expect(getAnswerGhostSuffix("¿Ho", "¿Hola?", strict)).toBe("la?");
  });

  it.each(["Hola ", "?Hola ", "¿Hola  ", "Hola\u00a0", "Hola \u200b"])("does not duplicate trailing prefix whitespace: %s", (input) => {
    expect(getAnswerGhostSuffix(input, "¿Hola mundo?", tolerant)).toBe("mundo");
    expect(answersMatch(input, "¿Hola?", tolerant)).toBe(true);
  });

  it("keeps untyped separators and letters in ghost suffixes", () => {
    expect(getAnswerGhostSuffix("Hola", "¿Hola mundo?", tolerant)).toBe(" mundo");
    expect(getAnswerGhostSuffix("Ho ", "¿Hola mundo?", tolerant)).toBe("la mundo");
    expect(getAnswerGhostSuffix("Hola ", "Hola mundo?", strict)).toBe("mundo?");
    expect(getAnswerGhostSuffix("Hola ", "¿Hola?", tolerant)).toBe("");
  });
});

describe("Spanish punctuation input conversion", () => {
  it.each([
    ["", "?Cómo estás?", ["¿Cómo estás?"], "¿Cómo estás?"],
    ["", "!Hola!", ["¡Hola!"], "¡Hola!"],
    ["Hola, ", "Hola, ?", ["Hola, ¿cómo estás?"], "Hola, ¿"],
    ["", "Hola, ?cómo estás?", ["Hola, ¿cómo estás?"], "Hola, ¿cómo estás?"],
    ["¿Cómo estás", "¿Cómo estás?", ["¿Cómo estás?"], "¿Cómo estás?"],
    ["", "?", ["¿Hola?", "Hola"], "?"],
    ["", "?", ["¿Hola?", "¿Qué tal?"], "¿"],
    ["", "?", ["Hello?"], "?"],
    ["Hola, ¿", "Hola, ", ["Hola, ¿cómo estás?"], "Hola, "],
    ["?Hola", "?Hola!", ["¿Hola!"], "?Hola!"],
    ["Hola, x", "Hola, ?", ["Hola, ¿cómo estás?"], "Hola, ¿"],
    ["Hola?", "Hila?", ["Hola?"], "Hila?"],
    ["", "  ?hola?", ["¿Hola?"], "  ¿hola?"],
    ["", "¿Hola!", ["¿Hola?"], "¿Hola!"],
  ])("converts only unambiguous newly edited marks: %s → %s", (previous, next, expected, result) => {
    expect(convertSpanishPunctuation(previous as string, next as string, expected as string[], false)).toBe(result);
  });

  it("uses the diacritics setting when matching prefixes", () => {
    expect(convertSpanishPunctuation("", "Si, ?cómo?", ["Sí, ¿cómo?"], false)).toBe("Si, ?cómo?");
    expect(convertSpanishPunctuation("", "Si, ?cómo?", ["Sí, ¿cómo?"], true)).toBe("Si, ¿cómo?");
  });
});
