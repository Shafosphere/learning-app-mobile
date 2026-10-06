import { formatNavbarStatValue } from "../formatNavbarStatValue";

describe("formatNavbarStatValue", () => {
  it.each([
    [0, "0"],
    [999, "999"],
    [1_000, "1k"],
    [1_234, "1,2k"],
    [9_950, "10k"],
    [12_345, "12k"],
    [99_500, "100k"],
    [123_456, "123k"],
    [999_499, "999k"],
    [999_500, "1M"],
    [999_999, "1M"],
    [1_234_567, "1,2M"],
    [999_500_000, "1B"],
  ])("formats %i within the small button as %s", (value, expected) => {
    expect(formatNavbarStatValue(value, "pl", 4)).toBe(expected);
  });

  it("keeps an extra decimal when the wider button has space", () => {
    expect(formatNavbarStatValue(12_345, "pl", 5)).toBe("12,3k");
    expect(formatNavbarStatValue(123_456, "pl", 5)).toBe("123k");
  });

  it("uses the app language for the decimal separator", () => {
    expect(formatNavbarStatValue(1_234, "en", 4)).toBe("1.2k");
    expect(formatNavbarStatValue(12_345, "en", 5)).toBe("12.3k");
  });
});
