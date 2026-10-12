import {
  applyAnswerCasing,
  compareAnswerText,
  getAnswerGhostSuffix,
  getAnswerMismatchFlags,
  getAnswerTypoDiff,
} from "../answerComparison";
import { normalizeAnswerText } from "../answerNormalization";

describe("answer comparison source positions", () => {
  it.each([false, true])("preserves positions when lowercasing revises an earlier sigma (ignoreDiacritics=%s)", (ignoreDiacritics) => {
    const options = { ignoreDiacritics, ignoreBoundaryPunctuation: true };
    const comparison = compareAnswerText("ΟΣΑ", "ΟΣΒ", options);

    expect(comparison.input.text).toBe(normalizeAnswerText("ΟΣΑ", ignoreDiacritics, true));
    expect(comparison.input.positions).toEqual([
      { start: 0, end: 1, graphemeIndex: 0 },
      { start: 1, end: 2, graphemeIndex: 1 },
      { start: 2, end: 3, graphemeIndex: 2 },
    ]);
    expect(getAnswerGhostSuffix("ΟΣ", "ΟΣΑ", options)).toBe("Α");
    expect(getAnswerMismatchFlags("ΟΣΑ", "ΟΣΒ", options)).toEqual([false, false, true]);
    expect(getAnswerTypoDiff("ΟΣΑ", "ΟΣΒ", options)).toMatchObject({
      index: 2, inputLength: 1, inputChar: "Α", expectedChar: "Β",
    });
    expect(applyAnswerCasing("ΟΣΑ", "οσΑ", options)).toBe("οσΑ");
    expect(getAnswerGhostSuffix("?ΟΣ", "¿ΟΣΑ?", options)).toBe("Α");
  });

  it.each([
    ["İΑ", false, "i\u0307α", [0, 0, 1]],
    ["İΑ", true, "iα", [0, 1]],
    ["ﬃΑ", false, "ffiα", [0, 0, 0, 1]],
    ["𐐀Α", false, "𐐨α", [0, 0, 1]],
    ["Ο\u0301ΣΑ", true, "οσα", [0, 1, 2]],
  ] as const)("keeps expansion and grapheme mappings for %s (ignoreDiacritics=%s)", (input, ignoreDiacritics, text, indices) => {
    const options = { ignoreDiacritics, ignoreBoundaryPunctuation: false };
    const projection = compareAnswerText(input, input, options).input;
    expect(projection.text).toBe(text);
    expect(projection.text).toBe(normalizeAnswerText(input, ignoreDiacritics));
    expect(projection.positions.map((position) => position.graphemeIndex)).toEqual(indices);
    expect(getAnswerGhostSuffix(input.slice(0, -1), input, options)).toBe("Α");
  });
});
