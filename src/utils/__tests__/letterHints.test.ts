import type { LetterHintSettings } from "@/src/contexts/settings/types";
import { DEFAULT_LETTER_HINT_SETTINGS, normalizeLetterHintSettings, resolveLetterHint, selectLetterHintProfile } from "../letterHints";

const standard = { ...DEFAULT_LETTER_HINT_SETTINGS, enabled: true };
const custom: LetterHintSettings = { enabled: true, profile: "custom", boxOneLimit: 3, boxTwoLimit: 3 };

describe("letter hints", () => {
  it.each([
    ["a", ""], ["on", ""], ["kot", "k"], ["apple", "a"],
    ["planet", "pl"], ["elephant", "el"], ["pineapple", "pin"],
    ["kot domowy", "k"], ["  planet earth  ", "pl"], ["łódź", "ł"],
    ["z\u0307aba", "ż"], ["l'amour", ""], ["on the moon", ""],
  ])("limits %s by the first word's grapheme length", (answer, prefix) => {
    expect(resolveLetterHint({ settings: custom, answers: [answer], activeBox: "boxOne" })).toBe(prefix);
  });

  it.each(["26", "2026", "-26", "2,6", "2026-10-08", "08/10/2026", "H2O", "Route 66", "²", "２６", "$x+y$", "\\(x+y\\)", "x + y", "x/y", "#planet", "🌍 planet", "", "   "])("does not expose numeric or symbolic answer %s", (answer) => {
    expect(resolveLetterHint({ settings: custom, answers: [answer], activeBox: "boxOne" })).toBe("");
  });

  it.each([
    ["gentle", "p", ""], ["standard", "pi", "p"], ["stronger", "pin", "pi"],
  ] as const)("uses %s profile limits", (profile, one, two) => {
    const settings = selectLetterHintProfile(standard, profile);
    expect(resolveLetterHint({ settings, answers: ["pineapple"], activeBox: "boxOne" })).toBe(one);
    expect(resolveLetterHint({ settings, answers: ["pineapple"], activeBox: "boxTwo" })).toBe(two);
  });

  it("keeps the first alternative stable and does not reveal later answers", () => {
    expect(resolveLetterHint({ settings: standard, answers: ["car", "automobile"], activeBox: "boxOne" })).toBe("c");
    expect(resolveLetterHint({ settings: standard, answers: ["26", "twenty six"], activeBox: "boxOne" })).toBe("");
    expect(resolveLetterHint({ settings: standard, answers: [], activeBox: "boxOne" })).toBe("");
  });

  it.each([null, "boxZero", "boxThree", "boxFour", "boxFive"] as const)("does not help in %s", (activeBox) => {
    expect(resolveLetterHint({ settings: standard, answers: ["planet"], activeBox })).toBe("");
  });

  it("respects disabling and separate custom limits", () => {
    expect(resolveLetterHint({ settings: { ...custom, enabled: false }, answers: ["planet"], activeBox: "boxOne" })).toBe("");
    expect(resolveLetterHint({ settings: { ...custom, boxOneLimit: 0 }, answers: ["planet"], activeBox: "boxOne" })).toBe("");
    expect(resolveLetterHint({ settings: { ...custom, boxTwoLimit: 1 }, answers: ["planet"], activeBox: "boxTwo" })).toBe("p");
  });

  it("normalizes saved settings without bypassing safety or discarding disabled customization", () => {
    expect(normalizeLetterHintSettings(null)).toEqual(DEFAULT_LETTER_HINT_SETTINGS);
    expect(normalizeLetterHintSettings({ ...custom, enabled: false, boxOneLimit: 99, boxTwoLimit: -1 })).toEqual({ ...custom, enabled: false, boxOneLimit: 3, boxTwoLimit: 0 });
    expect(normalizeLetterHintSettings({ ...custom, profile: "standard" })).toEqual(standard);
    expect(selectLetterHintProfile(custom, "custom")).toEqual(custom);
  });
});
