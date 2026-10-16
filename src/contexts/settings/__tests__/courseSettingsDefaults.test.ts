import { OFFICIAL_PACKS } from "@/src/constants/officialPacks";
import { resolveCourseSettingsDefaults } from "../courseSettingsDefaults";

it("uses manifest settings and code fallbacks for official courses", () => {
  const pack = OFFICIAL_PACKS.find((pack) => pack.slug === "eng_to_pl_first_50")!;
  const values = resolveCourseSettingsDefaults(pack);
  expect(values.boxZeroEnabled).toBe(true);
  expect(values.boxZeroAnswerSide).toBe("front");
  expect(values.audioSettings.enabled).toBe(pack.settings?.audioEnabled ?? false);
  expect(values.frontImageRole).toBe(pack.settings?.frontImageRole ?? "standard");
  expect(values.reviewsEnabled).toBe(pack.reviewsEnabled ?? true);
  expect(values.autoflowEnabled).toBe(true);
  expect(values.cardSize).toBe("large");
});

it("restores creator defaults for custom courses and respects button-only card types", () => {
  expect(resolveCourseSettingsDefaults()).toMatchObject({
    reviewsEnabled: false, boxZeroEnabled: false, boxZeroAnswerSide: "back",
    autoflowEnabled: true, showExplanationEnabled: true, explanationOnlyOnWrong: false,
    skipCorrectionEnabled: false, cardSize: "large", imageSize: "dynamic", imageFrameEnabled: true,
    audioSettings: { enabled: false, frontLanguage: null, backLanguage: null, autoplayMode: "non_native" },
  });
  expect(resolveCourseSettingsDefaults(undefined, true).skipCorrectionEnabled).toBe(true);
});

it("supports manifest aliases and preserves explicit false values", () => {
  expect(resolveCourseSettingsDefaults({ reviewsEnabled: false, settings: { Autoflow: false, boxZero: true, skipCorrection: true, imageFrameEnabled: false } })).toMatchObject({
    reviewsEnabled: false, autoflowEnabled: false, boxZeroEnabled: true, skipCorrectionEnabled: true, imageFrameEnabled: false,
  });
});
