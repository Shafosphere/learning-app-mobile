export type CoachmarkAdvanceEvent =
  | "manual"
  | "pin_course"
  | "activate_course"
  | "press_next";

export type CoachmarkFlowStep = {
  id: string;
  targetId: string;
  titleKey: string;
  descriptionKey: string;
  kind: "info" | "action" | "success";
  advanceOn: CoachmarkAdvanceEvent;
  spotlight?: boolean;
  blockOutside?: boolean;
  blockSpotlight?: boolean;
  layout?: "default" | "centered_intro";
  scrollLocked?: boolean;
};

export const COURSE_PIN_COACHMARK_STEPS: CoachmarkFlowStep[] = [
  {
    id: "course-pin-step-1",
    targetId: "course-pin-bubble-anchor",
    titleKey: "onboarding.coursePin.step1.title",
    descriptionKey: "onboarding.coursePin.step1.description",
    kind: "info",
    advanceOn: "manual",
    blockOutside: true,
    layout: "centered_intro",
    scrollLocked: true,
  },
  {
    id: "course-pin-step-2",
    targetId: "course-pin-bubble-anchor",
    titleKey: "onboarding.coursePin.step2.title",
    descriptionKey: "onboarding.coursePin.step2.description",
    kind: "info",
    advanceOn: "manual",
    blockOutside: true,
    scrollLocked: true,
  },
  {
    id: "course-pin-step-3",
    targetId: "course-pin-first-card",
    titleKey: "onboarding.coursePin.step3.title",
    descriptionKey: "onboarding.coursePin.step3.description",
    kind: "info",
    advanceOn: "manual",
    spotlight: true,
    blockOutside: true,
    blockSpotlight: true,
    scrollLocked: true,
  },
  {
    id: "course-pin-step-4",
    targetId: "course-pin-bubble-anchor",
    titleKey: "onboarding.coursePin.step4.title",
    descriptionKey: "onboarding.coursePin.step4.description",
    kind: "info",
    advanceOn: "manual",
    blockOutside: true,
    scrollLocked: true,
  },
  {
    id: "course-pin-step-5",
    targetId: "course-pin-first-pin-button",
    titleKey: "onboarding.coursePin.step5.title",
    descriptionKey: "onboarding.coursePin.step5.description",
    kind: "info",
    advanceOn: "manual",
    spotlight: true,
    blockOutside: true,
    blockSpotlight: true,
    scrollLocked: true,
  },
  {
    id: "course-pin-step-6",
    targetId: "course-pin-tab-switcher",
    titleKey: "onboarding.coursePin.step6.title",
    descriptionKey: "onboarding.coursePin.step6.description",
    kind: "info",
    advanceOn: "manual",
    spotlight: true,
    blockOutside: true,
    blockSpotlight: true,
    scrollLocked: true,
  },
  {
    id: "course-pin-step-7",
    targetId: "course-pin-bubble-anchor",
    titleKey: "onboarding.coursePin.step7.title",
    descriptionKey: "onboarding.coursePin.step7.description",
    kind: "info",
    advanceOn: "pin_course",
  },
  {
    id: "course-pin-step-8",
    targetId: "course-pin-bubble-anchor",
    titleKey: "onboarding.coursePin.step8.title",
    descriptionKey: "onboarding.coursePin.step8.description",
    kind: "success",
    advanceOn: "manual",
  },
  {
    id: "course-pin-step-9",
    targetId: "course-pin-next-button",
    titleKey: "onboarding.coursePin.step9.title",
    descriptionKey: "onboarding.coursePin.step9.description",
    kind: "action",
    advanceOn: "press_next",
    spotlight: true,
    scrollLocked: true,
  },
];

export const COURSE_ACTIVATE_COACHMARK_STEPS: CoachmarkFlowStep[] = [
  {
    id: "course-activate-step-1",
    targetId: "course-activate-bubble-anchor",
    titleKey: "onboarding.courseActivate.step1.title",
    descriptionKey: "onboarding.courseActivate.step1.description",
    kind: "info",
    advanceOn: "manual",
    blockOutside: true,
  },
  {
    id: "course-activate-step-2",
    targetId: "course-activate-bubble-anchor",
    titleKey: "onboarding.courseActivate.step2.title",
    descriptionKey: "onboarding.courseActivate.step2.description",
    kind: "info",
    advanceOn: "manual",
    blockOutside: true,
  },
  {
    id: "course-activate-step-3",
    targetId: "course-activate-first-card",
    titleKey: "onboarding.courseActivate.step3.title",
    descriptionKey: "onboarding.courseActivate.step3.description",
    kind: "info",
    advanceOn: "manual",
    spotlight: true,
    blockOutside: true,
    blockSpotlight: true,
  },
  {
    id: "course-activate-step-4",
    targetId: "course-activate-bubble-anchor",
    titleKey: "onboarding.courseActivate.step4.title",
    descriptionKey: "onboarding.courseActivate.step4.description",
    kind: "action",
    advanceOn: "activate_course",
  },
  {
    id: "course-activate-step-5",
    targetId: "course-activate-next-button",
    titleKey: "onboarding.courseActivate.step5.title",
    descriptionKey: "onboarding.courseActivate.step5.description",
    kind: "action",
    advanceOn: "press_next",
    spotlight: true,
  },
];

export const COURSE_ENTRY_SETTINGS_COACHMARK_STEPS: CoachmarkFlowStep[] = [
  {
    id: "course-entry-settings-step-1",
    targetId: "course-entry-settings-bubble-anchor",
    titleKey: "onboarding.courseEntrySettings.step1.title",
    descriptionKey: "onboarding.courseEntrySettings.step1.description",
    kind: "info",
    advanceOn: "manual",
    blockOutside: true,
    scrollLocked: true,
  },
  {
    id: "course-entry-settings-step-2",
    targetId: "course-entry-settings-options",
    titleKey: "onboarding.courseEntrySettings.step2.title",
    descriptionKey: "onboarding.courseEntrySettings.step2.description",
    kind: "info",
    advanceOn: "manual",
    spotlight: true,
    blockOutside: true,
    blockSpotlight: true,
    scrollLocked: true,
  },
  {
    id: "course-entry-settings-step-3",
    targetId: "course-entry-settings-bubble-anchor",
    titleKey: "onboarding.courseEntrySettings.step3.title",
    descriptionKey: "onboarding.courseEntrySettings.step3.description",
    kind: "info",
    advanceOn: "manual",
  },
  {
    id: "course-entry-settings-step-4",
    targetId: "course-entry-settings-bubble-anchor",
    titleKey: "onboarding.courseEntrySettings.step4.title",
    descriptionKey: "onboarding.courseEntrySettings.step4.description",
    kind: "info",
    advanceOn: "manual",
    blockOutside: true,
    scrollLocked: true,
  },
  {
    id: "course-entry-settings-step-5",
    targetId: "course-entry-settings-next-button",
    titleKey: "onboarding.courseEntrySettings.step5.title",
    descriptionKey: "onboarding.courseEntrySettings.step5.description",
    kind: "action",
    advanceOn: "press_next",
    spotlight: true,
    scrollLocked: true,
  },
];

export const FLASHCARDS_COACHMARK_STEPS: CoachmarkFlowStep[] = [
  {
    id: "flashcards-step-1",
    targetId: "flashcards-bubble-anchor",
    titleKey: "onboarding.flashcards.step1.title",
    descriptionKey: "onboarding.flashcards.step1.description",
    kind: "info",
    advanceOn: "manual",
    blockOutside: true,
  },
  {
    id: "flashcards-step-2",
    targetId: "flashcards-bubble-anchor",
    titleKey: "onboarding.flashcards.step2.title",
    descriptionKey: "onboarding.flashcards.step2.description",
    kind: "info",
    advanceOn: "manual",
    blockOutside: true,
  },
  {
    id: "flashcards-step-3",
    targetId: "flashcards-card-section",
    titleKey: "onboarding.flashcards.step3.title",
    descriptionKey: "onboarding.flashcards.step3.description",
    kind: "info",
    advanceOn: "manual",
    spotlight: true,
    blockOutside: true,
    blockSpotlight: true,
  },
  {
    id: "flashcards-step-4",
    targetId: "flashcards-boxes-section",
    titleKey: "onboarding.flashcards.step4.title",
    descriptionKey: "onboarding.flashcards.step4.description",
    kind: "info",
    advanceOn: "manual",
    spotlight: true,
    blockOutside: true,
    blockSpotlight: true,
  },
  {
    id: "flashcards-step-5",
    targetId: "flashcards-buttons-section",
    titleKey: "onboarding.flashcards.step5.title",
    descriptionKey: "onboarding.flashcards.step5.description",
    kind: "info",
    advanceOn: "manual",
    spotlight: true,
    blockOutside: true,
    blockSpotlight: true,
  },
];
