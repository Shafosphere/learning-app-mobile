import {
  getLearningReminderNotificationTitle,
  selectLearningReminderNotificationBody,
} from "@/src/services/learningReminderMessages";

describe("learning reminder messages", () => {
  it("uses the localized fixed notification title", () => {
    expect(getLearningReminderNotificationTitle("pl")).toBe("Czas na fiszki");
    expect(getLearningReminderNotificationTitle("en")).toBe("Flashcard time");
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
});

