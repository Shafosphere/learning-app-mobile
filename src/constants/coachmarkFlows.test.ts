import {
  COURSE_ACTIVATE_COACHMARK_STEPS,
  COURSE_ENTRY_SETTINGS_COACHMARK_STEPS,
  COURSE_PIN_COACHMARK_STEPS,
  FLASHCARDS_COACHMARK_STEPS,
  FLASHCARDS_BOX_ZERO_COACHMARK_STEPS,
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
  it("walks through box zero without waiting for an answer from empty box one", () => {
    expect(FLASHCARDS_BOX_ZERO_COACHMARK_STEPS.find((step) => step.id === "flashcards-step-8"))
      .toMatchObject({ advanceOn: "manual", blockOutside: true, expectedBox: undefined });
    expect(FLASHCARDS_BOX_ZERO_COACHMARK_STEPS.every((step) => step.advanceOn === "manual")).toBe(true);
    expect(FLASHCARDS_BOX_ZERO_COACHMARK_STEPS.some((step) => step.id === "flashcards-step-25")).toBe(true);
    expect(FLASHCARDS_BOX_ZERO_COACHMARK_STEPS.find((step) => step.id === "flashcards-step-6")?.descriptionKey)
      .toBe("onboarding.flashcards.boxZero.firstBox");
  });
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
    ).toEqual([
      "flashcards-card-section",
      "flashcards-buttons-section",
      "flashcards-confirm-button",
    ]);
  });

  it("introduces completed courses between the game and settings buttons", () => {
    const gameIndex = FLASHCARDS_COACHMARK_STEPS.findIndex(
      (step) => step.id === "flashcards-step-22",
    );
    const completedCoursesIndex = FLASHCARDS_COACHMARK_STEPS.findIndex(
      (step) => step.id === "flashcards-completed-courses",
    );
    const settingsIndex = FLASHCARDS_COACHMARK_STEPS.findIndex(
      (step) => step.id === "flashcards-step-23",
    );
    const completedCoursesStep = FLASHCARDS_COACHMARK_STEPS[completedCoursesIndex];

    expect(gameIndex).toBeLessThan(completedCoursesIndex);
    expect(completedCoursesIndex).toBeLessThan(settingsIndex);
    expect(completedCoursesStep).toMatchObject({
      targetId: "flashcards-completed-courses-button",
      titleKey: "onboarding.flashcards.completedCourses.title",
      descriptionKey: "onboarding.flashcards.completedCourses.description",
      advanceOn: "manual",
      spotlight: true,
      blockSpotlight: true,
    });
  });
});
