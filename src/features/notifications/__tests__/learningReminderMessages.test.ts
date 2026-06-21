import {
  getEndOfDayReminderNotificationTitle,
  getLearningReminderNotificationTitle,
  getReviewReminderNotificationTitle,
  selectEndOfDayReminderNotificationBody,
  selectLearningReminderNotificationBody,
  selectReviewReminderNotificationBody,
} from "@/src/features/notifications";

describe("learning reminder messages", () => {
  it("uses the localized fixed notification title", () => {
    expect(getLearningReminderNotificationTitle("pl")).toBe("Czas na fiszki");
    expect(getLearningReminderNotificationTitle("en")).toBe("Flashcard time");
    expect(getReviewReminderNotificationTitle("pl")).toBe("Powtórki czekają");
    expect(getReviewReminderNotificationTitle("en")).toBe("Reviews are waiting");
    expect(getEndOfDayReminderNotificationTitle("pl")).toBe("Jeszcze jest czas");
    expect(getEndOfDayReminderNotificationTitle("en")).toBe("Still time today");
  });

  it("mixes profile-specific and universal messages for known profiles", () => {
    const expectedPool = [
      "Dzień dobry! Za chwilkę czas na małą rundkę fiszek :3",
      "Fiszki już się przeciągają i czekają na Ciebie",
      "Za chwilkę Twoja pora na fiszki",
      "Fiszki już czekają i robią małe hop :3",
      "Nadchodzi czas na krótką powtórkę",
      "Jeszcze momencik i zaczynamy fiszkową misję",
    ];

    const body = selectLearningReminderNotificationBody({
      language: "pl",
      profile: "morning",
      slot: "lead",
      scheduledAt: new Date(2026, 0, 10, 18, 0, 0, 0),
    });

    expect(expectedPool).toContain(body);
  });

  it("uses only universal messages for an unknown profile", () => {
    const universalDuePool = [
      "To teraz! Wróć do fiszek na chwilkę",
      "Fiszki są gotowe. Ty też? :D",
      "Czas na małą porcję wiedzy",
      "Twoja seria fiszek czeka na kontynuację",
    ];

    for (let day = 10; day <= 16; day += 1) {
      const body = selectLearningReminderNotificationBody({
        language: "pl",
        profile: "unknown",
        slot: "due",
        scheduledAt: new Date(2026, 0, day, 19, 0, 0, 0),
      });

      expect(universalDuePool).toContain(body);
    }
  });

  it("keeps the same message for the same date, profile and slot", () => {
    const input = {
      language: "en",
      profile: "evening" as const,
      slot: "followUp" as const,
      scheduledAt: new Date(2026, 0, 10, 20, 0, 0, 0),
    };

    expect(selectLearningReminderNotificationBody(input)).toBe(
      selectLearningReminderNotificationBody(input)
    );
  });

  it("rotates messages across different days", () => {
    const firstDay = selectLearningReminderNotificationBody({
      language: "pl",
      profile: "unknown",
      slot: "due",
      scheduledAt: new Date(2026, 0, 10, 19, 0, 0, 0),
    });
    const secondDay = selectLearningReminderNotificationBody({
      language: "pl",
      profile: "unknown",
      slot: "due",
      scheduledAt: new Date(2026, 0, 11, 19, 0, 0, 0),
    });

    expect(secondDay).not.toBe(firstDay);
  });

  it("formats Polish review reminder bodies with correct flashcard inflection", () => {
    const cases = [
      [1, "Hej, masz 1 fiszkę do powtórki. Wchodzisz?"],
      [2, "Hej, masz 2 fiszki do powtórki. Wchodzisz?"],
      [3, "Hej, masz 3 fiszki do powtórki. Wchodzisz?"],
      [4, "Hej, masz 4 fiszki do powtórki. Wchodzisz?"],
      [5, "Hej, masz 5 fiszek do powtórki. Wchodzisz?"],
      [10, "Hej, masz 10 fiszek do powtórki. Wchodzisz?"],
      [12, "Hej, masz 12 fiszek do powtórki. Wchodzisz?"],
      [21, "Hej, masz 21 fiszek do powtórki. Wchodzisz?"],
      [22, "Hej, masz 22 fiszki do powtórki. Wchodzisz?"],
      [23, "Hej, masz 23 fiszki do powtórki. Wchodzisz?"],
      [24, "Hej, masz 24 fiszki do powtórki. Wchodzisz?"],
      [25, "Hej, masz 25 fiszek do powtórki. Wchodzisz?"],
      [112, "Hej, masz 112 fiszek do powtórki. Wchodzisz?"],
      [123, "Hej, masz 123 fiszki do powtórki. Wchodzisz?"],
    ] as const;

    for (const [dueReviewCount, expected] of cases) {
      expect(
        selectReviewReminderNotificationBody({
          language: "pl",
          dueReviewCount,
        })
      ).toBe(expected);
    }
  });

  it("formats English review reminder bodies with the due count", () => {
    expect(
      selectReviewReminderNotificationBody({
        language: "en",
        dueReviewCount: 23,
      })
    ).toBe("Hey, you have 23 flashcards to review. Jump in?");
  });

  it("selects deterministic end-of-day reminder bodies from localized pools", () => {
    const date = new Date(2026, 0, 10, 23, 0, 0, 0);
    const polishPool = [
      "Dzień powoli się kończy, ale na krótką rundkę jeszcze jest czas",
      "Jeszcze zdążysz zrobić mały postęp przed końcem dnia",
      "Końcówka dnia — kilka fiszek nadal się liczy",
      "Krótka powtórka na koniec dnia?",
    ];
    const englishPool = [
      "The day is winding down, but there is still time for a quick round",
      "You can still make a little progress before the day ends",
      "End of day — a good moment for a calm review",
      "A quick review to end the day?",
    ];

    const polish = selectEndOfDayReminderNotificationBody({
      language: "pl",
      scheduledAt: date,
    });
    const english = selectEndOfDayReminderNotificationBody({
      language: "en",
      scheduledAt: date,
    });

    expect(polishPool).toContain(polish);
    expect(englishPool).toContain(english);
    expect(
      selectEndOfDayReminderNotificationBody({
        language: "pl",
        scheduledAt: date,
      })
    ).toBe(polish);
  });
});
