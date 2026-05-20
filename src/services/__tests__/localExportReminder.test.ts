import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ensureLocalExportReminderFirstSeenAt,
  getLocalExportReminderState,
  getNextLocalExportReminderCheckAt,
  LOCAL_EXPORT_REMINDER_INTERVAL_MS,
  markLocalExportCompleted,
  markLocalExportReminderShown,
  shouldShowLocalExportReminder,
} from "@/src/services/localExportReminder";

describe("localExportReminder", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("stores firstSeenAt on first evaluation without showing immediately", async () => {
    const now = 1_000;

    await ensureLocalExportReminderFirstSeenAt(now);
    const state = await getLocalExportReminderState();

    expect(state.firstSeenAt).toBe(now);
    expect(shouldShowLocalExportReminder(state, now)).toBe(false);
  });

  it("shows after the interval when no export was completed", async () => {
    const firstSeenAt = 1_000;
    const now = firstSeenAt + LOCAL_EXPORT_REMINDER_INTERVAL_MS;

    await ensureLocalExportReminderFirstSeenAt(firstSeenAt);
    const state = await getLocalExportReminderState();

    expect(shouldShowLocalExportReminder(state, now)).toBe(true);
  });

  it("respects the prompt cooldown even when the export is old", async () => {
    const firstSeenAt = 1_000;
    const now = firstSeenAt + LOCAL_EXPORT_REMINDER_INTERVAL_MS * 4;
    const yesterday = now - 24 * 60 * 60 * 1000;

    await ensureLocalExportReminderFirstSeenAt(firstSeenAt);
    await markLocalExportReminderShown(yesterday);
    const state = await getLocalExportReminderState();

    expect(shouldShowLocalExportReminder(state, now)).toBe(false);
  });

  it("uses the successful export timestamp as the reminder reference", async () => {
    const firstSeenAt = 1_000;
    const exportAt = firstSeenAt + LOCAL_EXPORT_REMINDER_INTERVAL_MS * 2;
    const soonAfterExport = exportAt + 1_000;

    await ensureLocalExportReminderFirstSeenAt(firstSeenAt);
    await markLocalExportCompleted(exportAt);
    const state = await getLocalExportReminderState();

    expect(state.lastSuccessfulExportAt).toBe(exportAt);
    expect(shouldShowLocalExportReminder(state, soonAfterExport)).toBe(false);
  });

  it("schedules the next check from firstSeenAt", () => {
    const firstSeenAt = 1_000;
    const now = firstSeenAt + 60_000;

    expect(
      getNextLocalExportReminderCheckAt(
        {
          firstSeenAt,
          lastPromptShownAt: null,
          lastSuccessfulExportAt: null,
        },
        now
      )
    ).toBe(firstSeenAt + LOCAL_EXPORT_REMINDER_INTERVAL_MS);
  });

  it("schedules the next check from the successful export reference", () => {
    const firstSeenAt = 1_000;
    const lastSuccessfulExportAt =
      firstSeenAt + LOCAL_EXPORT_REMINDER_INTERVAL_MS * 2;
    const now = lastSuccessfulExportAt + 60_000;

    expect(
      getNextLocalExportReminderCheckAt(
        {
          firstSeenAt,
          lastPromptShownAt: null,
          lastSuccessfulExportAt,
        },
        now
      )
    ).toBe(lastSuccessfulExportAt + LOCAL_EXPORT_REMINDER_INTERVAL_MS);
  });

  it("uses the later check when prompt cooldown outlasts export age", () => {
    const now = LOCAL_EXPORT_REMINDER_INTERVAL_MS * 3;
    const firstSeenAt = 1_000;
    const lastPromptShownAt = now - 60_000;

    expect(
      getNextLocalExportReminderCheckAt(
        {
          firstSeenAt,
          lastPromptShownAt,
          lastSuccessfulExportAt: null,
        },
        now
      )
    ).toBe(lastPromptShownAt + LOCAL_EXPORT_REMINDER_INTERVAL_MS);
  });

  it("returns now when the next safe check is already due", () => {
    const firstSeenAt = 1_000;
    const now = firstSeenAt + LOCAL_EXPORT_REMINDER_INTERVAL_MS * 2;

    expect(
      getNextLocalExportReminderCheckAt(
        {
          firstSeenAt,
          lastPromptShownAt: null,
          lastSuccessfulExportAt: null,
        },
        now
      )
    ).toBe(now);
  });

  it("ignores invalid timestamps and caps future timestamps to now", () => {
    const now = 10_000;

    expect(
      getNextLocalExportReminderCheckAt(
        {
          firstSeenAt: Number.NaN,
          lastPromptShownAt: -1,
          lastSuccessfulExportAt: Number.POSITIVE_INFINITY,
        },
        now
      )
    ).toBeNull();

    expect(
      getNextLocalExportReminderCheckAt(
        {
          firstSeenAt: now + LOCAL_EXPORT_REMINDER_INTERVAL_MS * 10,
          lastPromptShownAt: null,
          lastSuccessfulExportAt: null,
        },
        now
      )
    ).toBe(now + LOCAL_EXPORT_REMINDER_INTERVAL_MS);
  });
});
