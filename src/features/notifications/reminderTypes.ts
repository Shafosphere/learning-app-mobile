export const REVIEW_DUE_REMINDER_KIND = "review_due";
export const STUDY_REMINDER_KIND = "study_reminder";
export const STREAK_WARNING_REMINDER_KIND = "streak_warning";

export type ReminderKind =
  | typeof REVIEW_DUE_REMINDER_KIND
  | typeof STUDY_REMINDER_KIND
  | typeof STREAK_WARNING_REMINDER_KIND;

export type ReminderRoute = "/review" | "/flashcards";

export type ReminderPlanEntry = {
  kind: ReminderKind;
  scheduledAt: Date;
  title: string;
  body: string;
  route: ReminderRoute;
  dueReviewCount?: number;
  dedupeKey: string;
};

export type ReminderReconcileReason =
  | "app_start"
  | "app_foreground"
  | "settings_changed"
  | "learning_completed"
  | "review_completed"
  | "permission_changed"
  | "midnight_rollover";

export const LEGACY_LEARNING_REMINDER_KIND = "learning_reminder";
export const LEGACY_REVIEW_REMINDER_KIND = "review_reminder";
export const LEGACY_END_OF_DAY_REMINDER_KIND = "end_of_day_reminder";

