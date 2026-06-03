import {
  COURSE_ACTIVATE_COACHMARK_STEPS,
  COURSE_ENTRY_SETTINGS_COACHMARK_STEPS,
  COURSE_PIN_COACHMARK_STEPS,
  FLASHCARDS_COACHMARK_STEPS,
  HINT_COACHMARK_STEPS,
  REVIEW_COURSES_COACHMARK_STEPS,
  REVIEW_FLASHCARDS_COACHMARK_STEPS,
} from "@/src/constants/coachmarkFlows";

const ALL_FLOWS = [
  COURSE_PIN_COACHMARK_STEPS,
  COURSE_ACTIVATE_COACHMARK_STEPS,
  COURSE_ENTRY_SETTINGS_COACHMARK_STEPS,
  REVIEW_COURSES_COACHMARK_STEPS,
  REVIEW_FLASHCARDS_COACHMARK_STEPS,
  FLASHCARDS_COACHMARK_STEPS,
  HINT_COACHMARK_STEPS,
];

describe("coachmark flow definitions", () => {
  it("blocks outside clicks on every manual onboarding step", () => {
    const manualStepsWithoutBlockOutside = ALL_FLOWS.flatMap((flow) =>
      flow
        .filter((step) => step.advanceOn === "manual" && !step.blockOutside)
        .map((step) => step.id),
    );

    expect(manualStepsWithoutBlockOutside).toEqual([]);
  });

  it("only lets the guided flashcards action steps pass through their intended targets", () => {
    expect(
      FLASHCARDS_COACHMARK_STEPS.find((step) => step.id === "flashcards-step-8")
        ?.passThroughTargetId,
    ).toBe("flashcards-box-one");
    expect(
      FLASHCARDS_COACHMARK_STEPS.find((step) => step.id === "flashcards-step-9")
        ?.passThroughTargetIds,
    ).toEqual(["flashcards-card-section", "flashcards-confirm-button"]);
  });
});
