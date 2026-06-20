import type { CoachmarkAdvanceEvent } from "@/src/constants/coachmarkFlows";

export type TutorialCompletionState = Partial<
  Record<CoachmarkAdvanceEvent, boolean>
>;

export type HintTutorialTriggerSource = "manual" | "auto";
