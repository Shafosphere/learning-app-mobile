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

const audioCourses = new Set([
  "eng_to_pl_first_50", "eng_to_pl_first_100", "eng_to_pl_first_250", "eng_to_pl_first_500",
  "eng_to_pl_a1", "eng_to_pl_a2", "eng_to_pl_b1", "eng_to_pl_b2",
  "es_to_pl_first_50", "es_to_pl_first_150", "es_to_pl_first_327",
  "es_to_en_first_50", "es_to_en_first_150", "es_to_en_first_327",
  "fr_to_pl_first_50", "fr_to_pl_first_150", "fr_to_pl_first_332",
  "fr_to_en_first_50", "fr_to_en_first_150", "fr_to_en_first_332",
  "french_a1", "french_a2", "french_b1", "french_b2",
]);
const hintCourses = new Set([
  "eng_to_pl_first_50", "eng_to_pl_first_100", "eng_to_pl_first_250",
  "es_to_pl_first_50", "es_to_pl_first_150", "es_to_en_first_50", "es_to_en_first_150",
  "fr_to_pl_first_50", "fr_to_pl_first_150", "fr_to_en_first_50", "fr_to_en_first_150",
]);
const boxZeroCourses = new Set([
  "eng_to_pl_first_50", "es_to_pl_first_50", "fr_to_pl_first_50",
  "es_to_en_first_50", "es_to_en_first_150", "es_to_en_first_327",
  "fr_to_en_first_50", "fr_to_en_first_150", "fr_to_en_first_332", "french_a1",
]);
const imageAnswerCourses = new Set([
  "eng_to_pl_first_50", "es_to_pl_first_50", "es_to_en_first_50",
  "fr_to_pl_first_50", "fr_to_en_first_50",
]);

it.each(OFFICIAL_PACKS.filter((pack) => !pack.retired))(
  "checks the explicit default policy for $slug",
  (pack) => {
    const buttonOnly = pack.defaultType === "true_false" || pack.defaultType === "self_assess";
    expect(resolveCourseSettingsDefaults(pack, buttonOnly)).toEqual({
      audioSettings: {
        enabled: audioCourses.has(pack.slug), autoplayMode: "non_native",
        frontLanguage: null, backLanguage: null,
      },
      autoflowEnabled: true,
      reviewsEnabled: true,
      showExplanationEnabled: true,
      explanationOnlyOnWrong: false,
      skipCorrectionEnabled: buttonOnly,
      trueFalseButtonsVariant: "true_false",
      boxZeroEnabled: boxZeroCourses.has(pack.slug),
      boxZeroAnswerSide: boxZeroCourses.has(pack.slug) ? "front" : "back",
      letterHintSettings: {
        enabled: hintCourses.has(pack.slug), profile: "standard", boxOneLimit: 2, boxTwoLimit: 1,
      },
      frontImageRole: imageAnswerCourses.has(pack.slug) ? "replace_back" : "standard",
      cardSize: "large",
      imageSize: ["ptaki", "drzewa_europy", "grzyby_podstawowe", "grzyby_rozpoznawanie"].includes(pack.slug) ? "very_large"
        : pack.slug.startsWith("flagi_") || pack.slug.startsWith("znaki_drogowe") ? "medium" : "dynamic",
      imageFrameEnabled: true,
    });
  },
);
