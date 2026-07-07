import { splitBackTextIntoAnswers, splitFrontTextIntoAnswers } from "./utils";

describe("splitBackTextIntoAnswers", () => {
  it.each([
    ["comma", "one, two", ["one", "two"]],
    ["semicolon", "one; two", ["one", "two"]],
    ["newline", "one\ntwo", ["one", "two"]],
  ])("splits answers separated by %s", (_separator, raw, expected) => {
    expect(splitBackTextIntoAnswers(raw)).toEqual(expected);
  });

  it("trims answers and removes empty entries", () => {
    expect(splitBackTextIntoAnswers("  one, , two ; \n three  ")).toEqual([
      "one",
      "two",
      "three",
    ]);
  });

  it("removes duplicates while preserving first-seen order", () => {
    expect(splitBackTextIntoAnswers("two, one; two\nthree; one")).toEqual([
      "two",
      "one",
      "three",
    ]);
  });

  it.each([[""], ["   "], [null], [undefined]])(
    "returns no answers for empty input %p",
    (raw) => {
      expect(splitBackTextIntoAnswers(raw)).toEqual([]);
    }
  );
});

describe("splitFrontTextIntoAnswers", () => {
  it.each([
    ["semicolon", "hello; hi", ["hello", "hi"]],
    ["newline", "hello\nhi", ["hello", "hi"]],
  ])("splits front answers separated by %s", (_separator, raw, expected) => {
    expect(splitFrontTextIntoAnswers(raw)).toEqual(expected);
  });

  it("trims front answers and removes empty entries", () => {
    expect(splitFrontTextIntoAnswers("  hello; ; hi \n hey  ")).toEqual([
      "hello",
      "hi",
      "hey",
    ]);
  });

  it("removes front duplicates while preserving first-seen order", () => {
    expect(splitFrontTextIntoAnswers("hi; hello\nhi; hey; hello")).toEqual([
      "hi",
      "hello",
      "hey",
    ]);
  });

  it("does not split front answers on comma", () => {
    expect(splitFrontTextIntoAnswers("hello, hi")).toEqual(["hello, hi"]);
  });

  it.each([[""], ["   "], [null], [undefined]])(
    "returns no front answers for empty input %p",
    (raw) => {
      expect(splitFrontTextIntoAnswers(raw)).toEqual([]);
    }
  );
});
