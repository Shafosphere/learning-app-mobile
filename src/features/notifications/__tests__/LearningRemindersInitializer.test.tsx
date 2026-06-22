import { act, render } from "@testing-library/react-native";

import LearningRemindersInitializer from "../LearningRemindersInitializer";

const mockRefreshLearningReminderSchedule = jest.fn();
let mockLearningRemindersEnabled = true;

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: () => ({
    learningRemindersEnabled: mockLearningRemindersEnabled,
    refreshLearningReminderSchedule: mockRefreshLearningReminderSchedule,
  }),
}));

describe("LearningRemindersInitializer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 5, 22, 23, 59, 0, 0));
    jest.clearAllMocks();
    mockLearningRemindersEnabled = true;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("keeps scheduling midnight rollover refreshes after the first one fires", () => {
    render(<LearningRemindersInitializer />);

    expect(mockRefreshLearningReminderSchedule).toHaveBeenCalledWith("app_start");

    act(() => {
      jest.advanceTimersByTime(2 * 60 * 1000);
    });

    expect(mockRefreshLearningReminderSchedule).toHaveBeenCalledWith(
      "midnight_rollover"
    );
    expect(
      mockRefreshLearningReminderSchedule.mock.calls.filter(
        ([reason]) => reason === "midnight_rollover"
      )
    ).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(24 * 60 * 60 * 1000);
    });

    expect(
      mockRefreshLearningReminderSchedule.mock.calls.filter(
        ([reason]) => reason === "midnight_rollover"
      )
    ).toHaveLength(2);
  });
});
