import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  __setLearningReminderAttachmentUrlForTests,
  __setLearningReminderNotificationsModuleForTests,
  LEARNING_REMINDER_CHANNEL_ID,
  REMINDER_CLEAR_BEFORE_NEXT_MS,
  REMINDER_MIN_TIMEOUT_MS,
  REMINDER_TIMEOUT_DEFAULT_MS,
  REVIEW_DUE_REMINDER_KIND,
  REVIEW_REMINDER_CHANNEL_ID,
  STREAK_WARNING_REMINDER_CHANNEL_ID,
  STREAK_WARNING_REMINDER_KIND,
  STUDY_REMINDER_KIND,
  cancelLearningReminderNotification,
  cancelLearningReminderNotificationsForDate,
  getManagedReminderRegistry,
  replaceManagedReminderSchedule,
  triggerLearningReminderNotificationRequestPreview,
  type ReminderKind,
  type ReminderPlanEntry,
} from "@/src/features/notifications";

type MockNotifyKitNotification = {
  id?: string;
  title?: string;
  body?: string;
  data: Record<string, unknown>;
  android: {
    channelId: string;
    smallIcon?: string;
    color?: string;
    largeIcon?: number | string | object;
    circularLargeIcon?: boolean;
    pressAction: {
      id: string;
    };
    timeoutAfter?: number;
  };
  ios?: {
    sound?: string;
    threadId?: string;
    attachments?: unknown[];
  };
};
type MockNotifyKitTrigger = {
  type: number | string;
  timestamp: number;
  alarmManager?: {
    type?: number;
  };
};

const mockCreateTriggerNotification: jest.Mock<
  Promise<string>,
  [MockNotifyKitNotification, MockNotifyKitTrigger]
> = jest.fn(
  async (notification: MockNotifyKitNotification, _trigger: MockNotifyKitTrigger) =>
    notification.id ?? "notification-id"
);
const mockCreateChannel = jest.fn(async (channel) => channel.id);
const mockGetTriggerNotifications = jest.fn();
const mockCancelNotification = jest.fn();
const mockGetDisplayedNotifications = jest.fn();
const mockCancelDisplayedNotification = jest.fn();
const AUTHORIZATION_STATUS = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
};
const mockNotifyKitModule = {
  AlarmType: {
    SET_EXACT_AND_ALLOW_WHILE_IDLE: 3,
  },
  AndroidImportance: {
    DEFAULT: 3,
  },
  AndroidNotificationSetting: {
    NOT_SUPPORTED: -1,
    DISABLED: 0,
    ENABLED: 1,
  },
  AuthorizationStatus: AUTHORIZATION_STATUS,
  TriggerType: {
    TIMESTAMP: 0,
  },
  cancelDisplayedNotification: mockCancelDisplayedNotification,
  cancelNotification: mockCancelNotification,
  createChannel: mockCreateChannel,
  createTriggerNotification: mockCreateTriggerNotification,
  getDisplayedNotifications: mockGetDisplayedNotifications,
  getNotificationSettings: jest.fn(async () => ({
    authorizationStatus: AUTHORIZATION_STATUS.AUTHORIZED,
    android: {
      alarm: 1,
    },
  })),
  getPowerManagerInfo: jest.fn(async () => ({ activity: null })),
  getTriggerNotifications: mockGetTriggerNotifications,
  requestPermission: jest.fn(async () => ({
    authorizationStatus: AUTHORIZATION_STATUS.AUTHORIZED,
  })),
};

function makeReminderEntry(
  kind: ReminderKind,
  scheduledAt: Date
): ReminderPlanEntry {
  const dayKey = [
    scheduledAt.getFullYear(),
    String(scheduledAt.getMonth() + 1).padStart(2, "0"),
    String(scheduledAt.getDate()).padStart(2, "0"),
  ].join("-");
  return {
    kind,
    scheduledAt,
    title: `${kind} title`,
    body: `${kind} body`,
    route: kind === REVIEW_DUE_REMINDER_KIND ? "/review" : "/flashcards",
    ...(kind === REVIEW_DUE_REMINDER_KIND ? { dueReviewCount: 23 } : null),
    dedupeKey: `${kind}:${dayKey}`,
  };
}

function makeLocalDate(hour: number, minute = 0, day = 1): Date {
  return new Date(2099, 0, day, hour, minute, 0, 0);
}

function isSameLocalDate(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getExpectedTimeout(
  entry: ReminderPlanEntry,
  sortedEntries: ReminderPlanEntry[]
): number {
  if (entry.kind === STREAK_WARNING_REMINDER_KIND) {
    return REMINDER_TIMEOUT_DEFAULT_MS;
  }

  const nextSameDayEntry = sortedEntries.find(
    (candidate) =>
      candidate.scheduledAt.getTime() > entry.scheduledAt.getTime() &&
      isSameLocalDate(candidate.scheduledAt, entry.scheduledAt)
  );

  if (!nextSameDayEntry) {
    return REMINDER_TIMEOUT_DEFAULT_MS;
  }

  return Math.max(
    REMINDER_MIN_TIMEOUT_MS,
    nextSameDayEntry.scheduledAt.getTime() -
      entry.scheduledAt.getTime() -
      REMINDER_CLEAR_BEFORE_NEXT_MS
  );
}

function getScheduledTimeouts(): {
  kind: ReminderKind;
  scheduledAt: string;
  timeoutAfter: number | undefined;
}[] {
  return mockCreateTriggerNotification.mock.calls
    .map(([notification]) => ({
      kind: notification.data.kind as ReminderKind,
      scheduledAt: notification.data.scheduledAt as string,
      timeoutAfter: notification.android.timeoutAfter,
    }))
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
}

function getExpectedScheduledTimeouts(
  entries: ReminderPlanEntry[],
  timeoutAfterByIndex: number[]
): {
  kind: ReminderKind;
  scheduledAt: string;
  timeoutAfter: number;
}[] {
  return entries
    .map((entry, index) => ({
      kind: entry.kind,
      scheduledAt: entry.scheduledAt.toISOString(),
      timeoutAfter: timeoutAfterByIndex[index],
    }))
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
}

function makeSeededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 2 ** 32;
  };
}

describe("learning reminder notifications", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockGetTriggerNotifications.mockResolvedValue([]);
    mockGetDisplayedNotifications.mockResolvedValue([]);
    mockCancelNotification.mockResolvedValue(undefined);
    mockCancelDisplayedNotification.mockResolvedValue(undefined);
    __setLearningReminderNotificationsModuleForTests(mockNotifyKitModule);
    __setLearningReminderAttachmentUrlForTests(null);
  });

  it("creates separate channels and per-kind notification metadata", async () => {
    await replaceManagedReminderSchedule([
      {
        kind: STUDY_REMINDER_KIND,
        scheduledAt: new Date("2099-01-01T19:00:00.000Z"),
        title: "Flashcard time",
        body: "Study now",
        route: "/flashcards",
        dedupeKey: "study_reminder:2099-01-01",
      },
      {
        kind: REVIEW_DUE_REMINDER_KIND,
        scheduledAt: new Date("2099-01-01T18:00:00.000Z"),
        title: "Reviews are waiting",
        body: "You have 23 cards",
        route: "/review",
        dueReviewCount: 23,
        dedupeKey: "review_due:2099-01-01",
      },
      {
        kind: STREAK_WARNING_REMINDER_KIND,
        scheduledAt: new Date("2099-01-01T22:00:00.000Z"),
        title: "Still time today",
        body: "Protect your streak",
        route: "/flashcards",
        dedupeKey: "streak_warning:2099-01-01",
      },
    ]);

    expect(mockCreateChannel).toHaveBeenCalledWith({
      id: LEARNING_REMINDER_CHANNEL_ID,
      name: "Study reminders",
      importance: 3,
      sound: "default",
    });
    expect(mockCreateChannel).toHaveBeenCalledWith({
      id: REVIEW_REMINDER_CHANNEL_ID,
      name: "Review reminders",
      importance: 3,
      sound: "default",
    });
    expect(mockCreateChannel).toHaveBeenCalledWith({
      id: STREAK_WARNING_REMINDER_CHANNEL_ID,
      name: "Streak reminders",
      importance: 3,
      sound: "default",
    });
    expect(mockCreateTriggerNotification).toHaveBeenCalledTimes(3);
    expect(
      mockCreateTriggerNotification.mock.calls.map(([notification, trigger]) => ({
        channelId: notification.android.channelId,
        kind: notification.data.kind,
        route: notification.data.route,
        dueReviewCount: notification.data.dueReviewCount,
        threadId: notification.ios?.threadId,
        alarmType: trigger.alarmManager?.type,
      }))
    ).toEqual([
      {
        channelId: REVIEW_REMINDER_CHANNEL_ID,
        kind: REVIEW_DUE_REMINDER_KIND,
        route: "/review",
        dueReviewCount: 23,
        threadId: REVIEW_DUE_REMINDER_KIND,
        alarmType: 3,
      },
      {
        channelId: LEARNING_REMINDER_CHANNEL_ID,
        kind: STUDY_REMINDER_KIND,
        route: "/flashcards",
        dueReviewCount: undefined,
        threadId: STUDY_REMINDER_KIND,
        alarmType: 3,
      },
      {
        channelId: STREAK_WARNING_REMINDER_CHANNEL_ID,
        kind: STREAK_WARNING_REMINDER_KIND,
        route: "/flashcards",
        dueReviewCount: undefined,
        threadId: STREAK_WARNING_REMINDER_KIND,
        alarmType: 3,
      },
    ]);
  });

  it("replaces old managed triggers and stores registry metadata", async () => {
    mockGetTriggerNotifications.mockResolvedValue([
      {
        notification: {
          id: "old-study-id",
          data: {
            kind: STUDY_REMINDER_KIND,
            scheduledAt: "2099-01-01T19:00:00.000Z",
            dedupeKey: "study_reminder:2099-01-01",
            route: "/flashcards",
          },
        },
        trigger: {},
      },
    ]);

    await replaceManagedReminderSchedule([
      {
        kind: REVIEW_DUE_REMINDER_KIND,
        scheduledAt: new Date("2099-01-01T18:00:00.000Z"),
        title: "Reviews are waiting",
        body: "You have 23 cards",
        route: "/review",
        dueReviewCount: 23,
        dedupeKey: "review_due:2099-01-01",
      },
    ]);

    expect(mockCancelNotification).toHaveBeenCalledWith("old-study-id");
    expect(await getManagedReminderRegistry()).toEqual([
      expect.objectContaining({
        kind: REVIEW_DUE_REMINDER_KIND,
        scheduledAt: "2099-01-01T18:00:00.000Z",
        dedupeKey: "review_due:2099-01-01",
        route: "/review",
        dueReviewCount: 23,
      }),
    ]);
  });

  it("dismisses displayed managed reminders when cancelling all", async () => {
    mockGetDisplayedNotifications.mockResolvedValue([
      {
        id: "presented-reminder-id",
        notification: {
          data: {
            kind: STREAK_WARNING_REMINDER_KIND,
            scheduledAt: "2099-01-01T22:00:00.000Z",
            dedupeKey: "streak_warning:2099-01-01",
            route: "/flashcards",
          },
        },
      },
      {
        id: "other-notification-id",
        notification: {
          data: {
            kind: "other",
          },
        },
      },
    ]);

    await cancelLearningReminderNotification();

    expect(mockCancelDisplayedNotification).toHaveBeenCalledTimes(1);
    expect(mockCancelDisplayedNotification).toHaveBeenCalledWith(
      "presented-reminder-id"
    );
  });

  it("cancels managed reminders for one local date and keeps remaining schedule", async () => {
    await replaceManagedReminderSchedule([
      {
        kind: STUDY_REMINDER_KIND,
        scheduledAt: new Date("2099-01-01T19:00:00.000Z"),
        title: "Flashcard time",
        body: "Study now",
        route: "/flashcards",
        dedupeKey: "study_reminder:2099-01-01",
      },
      {
        kind: STUDY_REMINDER_KIND,
        scheduledAt: new Date("2099-01-02T19:00:00.000Z"),
        title: "Flashcard time",
        body: "Study tomorrow",
        route: "/flashcards",
        dedupeKey: "study_reminder:2099-01-02",
      },
    ]);
    mockCancelNotification.mockClear();

    const remainingDates = await cancelLearningReminderNotificationsForDate(
      new Date("2099-01-01T12:00:00.000Z")
    );

    expect(mockCancelNotification).toHaveBeenCalledTimes(1);
    expect(mockCancelNotification.mock.calls[0][0]).toContain(
      "study_reminder:2099-01-01"
    );
    expect(await getManagedReminderRegistry()).toEqual([
      expect.objectContaining({
        scheduledAt: "2099-01-02T19:00:00.000Z",
        dedupeKey: "study_reminder:2099-01-02",
      }),
    ]);
    expect(remainingDates.map((date) => date.toISOString())).toEqual([
      "2099-01-02T19:00:00.000Z",
    ]);
  });

  it("triggers a preview using new kind metadata and iOS thread id", async () => {
    const result = await triggerLearningReminderNotificationRequestPreview(
      {
        kind: REVIEW_DUE_REMINDER_KIND,
        content: {
          title: "Reviews are waiting",
          body: "You have 42 cards",
        },
        data: {
          dueReviewCount: 42,
          route: "/review",
        },
      },
      new Date("2099-01-01T18:00:00.000Z")
    );

    expect(result.permissionState).toBe("granted");
    expect(result.notificationId).toContain("memicard-review_due:2099-01-01");
    expect(mockCreateTriggerNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          kind: REVIEW_DUE_REMINDER_KIND,
          scheduledAt: "2099-01-01T18:00:00.000Z",
          dedupeKey: "review_due:2099-01-01",
          dueReviewCount: 42,
          route: "/review",
        },
        android: expect.objectContaining({
          channelId: REVIEW_REMINDER_CHANNEL_ID,
        }),
        ios: expect.objectContaining({
          threadId: REVIEW_DUE_REMINDER_KIND,
        }),
      }),
      expect.objectContaining({
        alarmManager: {
          type: 3,
        },
      })
    );
  });

  it("adds the learning reminder logo attachment when available", async () => {
    __setLearningReminderAttachmentUrlForTests("file:///notification-logo.png");

    await replaceManagedReminderSchedule([
      {
        kind: STUDY_REMINDER_KIND,
        scheduledAt: new Date("2099-01-01T19:00:00.000Z"),
        title: "Flashcard time",
        body: "Study now",
        route: "/flashcards",
        dedupeKey: "study_reminder:2099-01-01",
      },
    ]);

    expect(mockCreateTriggerNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        ios: expect.objectContaining({
          sound: "default",
          threadId: STUDY_REMINDER_KIND,
          attachments: [
            {
              id: "learning-reminder-logo",
              url: "file:///notification-logo.png",
              typeHint: "public.png",
            },
          ],
        }),
      }),
      expect.anything()
    );
  });

  it.each([
    {
      name: "review, study and streak in default order",
      entries: [
        makeReminderEntry(REVIEW_DUE_REMINDER_KIND, makeLocalDate(18)),
        makeReminderEntry(STUDY_REMINDER_KIND, makeLocalDate(19)),
        makeReminderEntry(STREAK_WARNING_REMINDER_KIND, makeLocalDate(22)),
      ],
      expected: [
        50 * 60 * 1000,
        170 * 60 * 1000,
        REMINDER_TIMEOUT_DEFAULT_MS,
      ],
    },
    {
      name: "study clears before later review",
      entries: [
        makeReminderEntry(STUDY_REMINDER_KIND, makeLocalDate(17)),
        makeReminderEntry(REVIEW_DUE_REMINDER_KIND, makeLocalDate(18)),
        makeReminderEntry(STREAK_WARNING_REMINDER_KIND, makeLocalDate(22)),
      ],
      expected: [
        50 * 60 * 1000,
        230 * 60 * 1000,
        REMINDER_TIMEOUT_DEFAULT_MS,
      ],
    },
    {
      name: "review clears before streak when study is absent",
      entries: [
        makeReminderEntry(REVIEW_DUE_REMINDER_KIND, makeLocalDate(18)),
        makeReminderEntry(STREAK_WARNING_REMINDER_KIND, makeLocalDate(22)),
      ],
      expected: [230 * 60 * 1000, REMINDER_TIMEOUT_DEFAULT_MS],
    },
    {
      name: "study clears before streak when review is absent",
      entries: [
        makeReminderEntry(STUDY_REMINDER_KIND, makeLocalDate(19)),
        makeReminderEntry(STREAK_WARNING_REMINDER_KIND, makeLocalDate(22)),
      ],
      expected: [170 * 60 * 1000, REMINDER_TIMEOUT_DEFAULT_MS],
    },
    {
      name: "close reminders keep minimum timeout",
      entries: [
        makeReminderEntry(REVIEW_DUE_REMINDER_KIND, makeLocalDate(20, 30)),
        makeReminderEntry(STUDY_REMINDER_KIND, makeLocalDate(20, 35)),
        makeReminderEntry(STREAK_WARNING_REMINDER_KIND, makeLocalDate(22)),
      ],
      expected: [
        REMINDER_MIN_TIMEOUT_MS,
        75 * 60 * 1000,
        REMINDER_TIMEOUT_DEFAULT_MS,
      ],
    },
    {
      name: "review-only reminder uses default timeout",
      entries: [makeReminderEntry(REVIEW_DUE_REMINDER_KIND, makeLocalDate(18))],
      expected: [REMINDER_TIMEOUT_DEFAULT_MS],
    },
    {
      name: "study-only reminder uses default timeout",
      entries: [makeReminderEntry(STUDY_REMINDER_KIND, makeLocalDate(19))],
      expected: [REMINDER_TIMEOUT_DEFAULT_MS],
    },
  ])("sets Android timeoutAfter for $name", async ({ entries, expected }) => {
    await replaceManagedReminderSchedule(entries);

    expect(getScheduledTimeouts()).toEqual(
      getExpectedScheduledTimeouts(entries, expected)
    );
  });

  it("does not use tomorrow's reminder to shorten today's timeout", async () => {
    const entries = [
      makeReminderEntry(STUDY_REMINDER_KIND, makeLocalDate(23, 30, 1)),
      makeReminderEntry(REVIEW_DUE_REMINDER_KIND, makeLocalDate(0, 30, 2)),
    ];
    await replaceManagedReminderSchedule(entries);

    expect(getScheduledTimeouts()).toEqual(
      getExpectedScheduledTimeouts(entries, [
        REMINDER_TIMEOUT_DEFAULT_MS,
        REMINDER_TIMEOUT_DEFAULT_MS,
      ])
    );
  });

  it("keeps duplicate reminder kinds on different days distinct", async () => {
    const entries = [
      makeReminderEntry(STUDY_REMINDER_KIND, makeLocalDate(18, 0, 1)),
      makeReminderEntry(STUDY_REMINDER_KIND, makeLocalDate(19, 0, 2)),
    ];
    await replaceManagedReminderSchedule(entries);

    expect(getScheduledTimeouts()).toEqual(
      getExpectedScheduledTimeouts(entries, [
        REMINDER_TIMEOUT_DEFAULT_MS,
        REMINDER_TIMEOUT_DEFAULT_MS,
      ])
    );
  });

  it("sets valid Android timeoutAfter values across seeded reminder combinations", async () => {
    const random = makeSeededRandom(20260623);
    const kinds = [
      REVIEW_DUE_REMINDER_KIND,
      STUDY_REMINDER_KIND,
      STREAK_WARNING_REMINDER_KIND,
    ];

    for (let iteration = 0; iteration < 50; iteration += 1) {
      mockCreateTriggerNotification.mockClear();
      const entries = kinds
        .map((kind) => {
          const minuteOfDay = Math.floor(random() * 24 * 60);
          return makeReminderEntry(
            kind,
            makeLocalDate(Math.floor(minuteOfDay / 60), minuteOfDay % 60)
          );
        })
        .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime());

      await replaceManagedReminderSchedule(entries);

      expect(mockCreateTriggerNotification).toHaveBeenCalledTimes(entries.length);
      for (const [notification] of mockCreateTriggerNotification.mock.calls) {
        const timeoutAfter = notification.android.timeoutAfter;
        expect(typeof timeoutAfter).toBe("number");
        expect(Number.isFinite(timeoutAfter)).toBe(true);
        expect(timeoutAfter).toBeGreaterThan(0);

        const entry = entries.find(
          (candidate) => candidate.kind === notification.data.kind
        );
        expect(entry).toBeDefined();
        expect(timeoutAfter).toBe(getExpectedTimeout(entry!, entries));
      }
    }
  });
});
