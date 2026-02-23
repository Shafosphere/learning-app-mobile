export type IntroMessage = {
  titleKey: string;
  descriptionKey: string;
  gateId?: string;
  autoAdvanceOnGate?: boolean;
};

export const COURSE_ACTIVATE_INTRO_MESSAGES: IntroMessage[] = [
  {
    titleKey: "onboarding.courseActivate.step1.title",
    descriptionKey: "onboarding.courseActivate.step1.description",
  },
  {
    titleKey: "onboarding.courseActivate.step2.title",
    descriptionKey: "onboarding.courseActivate.step2.description",
  },
];

export const COURSE_PIN_INTRO_MESSAGES: IntroMessage[] = [
  {
    titleKey: "onboarding.coursePin.step1.title",
    descriptionKey: "onboarding.coursePin.step1.description",
  },
  {
    titleKey: "onboarding.coursePin.step2.title",
    descriptionKey: "onboarding.coursePin.step2.description",
  },
  {
    titleKey: "onboarding.coursePin.step3.title",
    descriptionKey: "onboarding.coursePin.step3.description",
    gateId: "course_pinned",
    autoAdvanceOnGate: true,
  },
  {
    titleKey: "onboarding.coursePin.step4.title",
    descriptionKey: "onboarding.coursePin.step4.description",
  },
];

export const FLASHCARDS_INTRO_MESSAGES: IntroMessage[] = [
  {
    titleKey: "onboarding.flashcards.step1.title",
    descriptionKey: "onboarding.flashcards.step1.description",
  },
  {
    titleKey: "onboarding.flashcards.step2.title",
    descriptionKey: "onboarding.flashcards.step2.description",
  },
  {
    titleKey: "onboarding.flashcards.step3.title",
    descriptionKey: "onboarding.flashcards.step3.description",
  },
  {
    titleKey: "onboarding.flashcards.step4.title",
    descriptionKey: "onboarding.flashcards.step4.description",
    gateId: "box_selected",
  },
  {
    titleKey: "onboarding.flashcards.step5.title",
    descriptionKey: "onboarding.flashcards.step5.description",
    gateId: "box_selected",
  },
];

export const BRAIN_INTRO_MESSAGES: IntroMessage[] = [
  {
    titleKey: "onboarding.brain.step1.title",
    descriptionKey: "onboarding.brain.step1.description",
  },
  {
    titleKey: "onboarding.brain.step2.title",
    descriptionKey: "onboarding.brain.step2.description",
  },
  {
    titleKey: "onboarding.brain.step3.title",
    descriptionKey: "onboarding.brain.step3.description",
  },
];
