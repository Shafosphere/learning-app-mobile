import type {
  CourseCompletionSummary,
  CustomCourseMasteryProgress,
} from "@/src/db/sqlite/db";
import type { BoxesState } from "@/src/types/boxes";
import { LinearTransition } from "react-native-reanimated";

export const STREAK_TARGET = 5;
export const STREAK_COOLDOWN_MS = 15 * 60 * 1000;
export const COMEBACK_COOLDOWN_MS = 20 * 60 * 1000;
export const LONG_THINK_MS = 12 * 1000;
export const LONG_THINK_COOLDOWN_MS = 30 * 60 * 1000;
export const LOSS_QUOTE_COOLDOWN_MS = 5 * 60 * 1000;
export const BOX_SPAM_WINDOW_MS = 2500;
export const BOX_SPAM_THRESHOLD = 40;
export const BOX_SPAM_COOLDOWN_MS = 0;
export const HINT_FAIL_THRESHOLD = 3;
export const HINT_COOLDOWN_MS = 10 * 60 * 1000;
export const HINT_TUTORIAL_FAIL_THRESHOLD = 5;
export const TRUE_FALSE_POST_OK_COOLDOWN_MS = 1000;
export const UI_WARMUP_DELAY_MS = 250;
export const SCREEN_LAYOUT_TRANSITION = LinearTransition.duration(420);
export const BOTTOM_BUTTONS_MIN_HEIGHT = 50;
export const BOTTOM_BUTTONS_DOCK_BOTTOM_OFFSET = 56;
export const COMPACT_BOTTOM_BUTTONS_DOCK_BOTTOM_OFFSET = 20;
export const BOTTOM_BUTTONS_KEYBOARD_DURATION_MS = 320;
export const ACTIONS_POSITION_NUDGE_TRIGGER_ANSWERS = 7;
export const ENABLE_FLASHCARDS_SCREEN_CONSOLE_LOGS = false;
export const topButtonsPreview = require("@/assets/images/settings/controls-two-hand.png");
export const bottomButtonsPreview = require("@/assets/images/settings/controls-one-hand.png");

export const EMPTY_COURSE_COMPLETION_SUMMARY: CourseCompletionSummary = {
  totalAnswers: 0,
  correctCount: 0,
  wrongCount: 0,
  timeMs: 0,
};

export const EMPTY_COURSE_MASTERY_PROGRESS: CustomCourseMasteryProgress = {
  cardsCount: 0,
  completedCardsCount: 0,
};

export const EMPTY_BOXES_STATE: BoxesState = {
  boxZero: [],
  boxOne: [],
  boxTwo: [],
  boxThree: [],
  boxFour: [],
  boxFive: [],
};
