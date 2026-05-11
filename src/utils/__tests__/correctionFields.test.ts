import { getCorrectionFieldRequirements } from "@/src/utils/correctionFields";

describe("getCorrectionFieldRequirements", () => {
  it.each([
    {
      correction: { reversed: false, answerOnly: false },
      expected: { awers: false, rewers: true },
    },
    {
      correction: { reversed: true, answerOnly: false },
      expected: { awers: true, rewers: false },
    },
    {
      correction: { reversed: false, answerOnly: true },
      expected: { awers: false, rewers: true },
    },
    {
      correction: { reversed: true, answerOnly: true },
      expected: { awers: true, rewers: true },
    },
  ])("matches rendered correction fields for %#", ({ correction, expected }) => {
    expect(getCorrectionFieldRequirements(correction)).toEqual(expected);
  });
});
