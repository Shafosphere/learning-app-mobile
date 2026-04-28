import { normalizeAnswerText } from "@/src/utils/answerNormalization";

describe("normalizeAnswerText", () => {
  it("normalizes autocorrect whitespace artifacts", () => {
    expect(
      normalizeAnswerText(
        "  Georgia\u00A0Południowa   i Sand\u200Bwich Południowy  ",
        false,
      ),
    ).toBe("georgia południowa i sandwich południowy");
  });

  it("optionally strips diacritics", () => {
    expect(normalizeAnswerText("Południowy", true)).toBe("poludniowy");
  });
});
