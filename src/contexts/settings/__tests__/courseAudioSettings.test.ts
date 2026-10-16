import { allowsAutomaticAudio, normalizeCourseAudioSettings, normalizeFlashcardAutoplayMode } from "../courseAudioSettings";

it("keeps older audio preferences intact and defaults unknown course modes to non-native", () => {
  const legacy = { enabled: false, frontLanguage: "en-US" as const, backLanguage: "pl-PL" as const };
  expect(normalizeCourseAudioSettings(legacy)).toEqual(legacy);
  expect(normalizeCourseAudioSettings({ ...legacy, autoplayMode: "invalid" as never })).toEqual(legacy);
  expect(normalizeCourseAudioSettings({ ...legacy, autoplayMode: "inherit" as never })).toEqual(legacy);
  for (const autoplayMode of ["non_native", "all", "off"] as const) {
    expect(normalizeCourseAudioSettings({ ...legacy, autoplayMode })).toEqual({ ...legacy, autoplayMode });
  }
});

it.each(["en-US", "en-GB", "EN_us", "en"])("compares native language using the base code of %s", (language) => {
  expect(allowsAutomaticAudio("non_native", language, "en")).toBe(false);
  expect(allowsAutomaticAudio("non_native", language, "pl")).toBe(true);
  expect(allowsAutomaticAudio("all", language, "en")).toBe(true);
  expect(allowsAutomaticAudio("off", language, "pl")).toBe(false);
});

it("defaults missing course values to non-native and rejects missing playback languages", () => {
  expect(normalizeFlashcardAutoplayMode("invalid")).toBe("non_native");
  expect(normalizeFlashcardAutoplayMode(null)).toBe("non_native");
  expect(allowsAutomaticAudio("all", null, "pl")).toBe(false);
});
