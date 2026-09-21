import { getFaceForQuote, resolveNavbarMascotFace } from "../navbarMascotFaces";

describe("navbar mascot quote emotions", () => {
  it.each([
    ["win_standard_0", "win_standard", "blushed"],
    ["win_fast_0", "win_fast", "happy"],
    ["win_mastery_0", "win_mastery", "love"],
    ["loss_0", "loss", "sad"],
    ["box_spam_0", "box_spam", "surprised"],
    ["box_spam_2", "box_spam", "angry"],
    ["box_spam_5", "box_spam", "crying"],
    ["easter_2", "easter", "angry"],
    ["hint_0", "hint", "surprised"],
    ["general_0", "general", "nice"],
  ])("maps %s to %s", (id, category, face) => {
    expect(getFaceForQuote(id, category)).toBe(face);
  });
});

describe("navbar mascot priority", () => {
  it("keeps popup face over quote, tap, and idle state", () => {
    expect(resolveNavbarMascotFace({
      popup: { color: "angry" },
      quote: { id: "win_mastery_0", category: "win_mastery" },
      tapFace: "blushed",
    })).toBe("sad");
  });

  it("falls through quote, tap, then happy idle", () => {
    expect(resolveNavbarMascotFace({ popup: null, quote: { id: "loss_0", category: "loss" }, tapFace: "blushed" })).toBe("sad");
    expect(resolveNavbarMascotFace({ popup: null, quote: null, tapFace: "blushed" })).toBe("blushed");
    expect(resolveNavbarMascotFace({ popup: null, quote: null, tapFace: null })).toBe("happy");
  });
});
