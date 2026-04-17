import { stripDiacritics } from "@/src/utils/diacritics";

describe("stripDiacritics", () => {
  it("removes Polish diacritics", () => {
    expect(stripDiacritics("zażółć gęślą jaźń")).toBe("zazolc gesla jazn");
  });

  it("keeps plain ASCII unchanged", () => {
    expect(stripDiacritics("flashcards")).toBe("flashcards");
  });
});
