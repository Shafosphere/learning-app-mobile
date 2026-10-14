import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import AppearanceSection from "../AppearanceSection";
import LearningSection from "../LearningSection";
import { useSettings } from "@/src/contexts/SettingsContext";

jest.mock("@/src/contexts/SettingsContext", () => ({ useSettings: jest.fn() }));
jest.mock("@/src/screens/settings/SettingsScreen/SettingsScreen-styles", () => ({ useStyles: () => ({}) }));
jest.mock("@/src/components/toggle/ToggleSwitch-styles", () => ({ useStyles: () => ({}) }));
jest.mock("@/src/hooks/useDeviceLayout", () => ({ useDeviceLayout: () => ({ isTabletLayout: false }) }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/src/components/selection/PreviewOptionSelector", () => ({ PreviewOptionSelector: () => null }));
jest.mock("@/src/components/slider/TrackSlider", () => {
  const { View } = jest.requireActual("react-native");
  return { TrackSlider: (props: object) => <View {...props} /> };
});
jest.mock("expo-asset", () => ({ Asset: { loadAsync: jest.fn().mockResolvedValue([]) } }));
jest.mock("expo-haptics", () => ({ selectionAsync: jest.fn() }));

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => {
  act(() => { jest.runAllTimers(); });
  jest.useRealTimers();
});

function settings(overrides: object = {}) {
  const value = {
    colors: {}, feedbackEnabled: false, feedbackVolume: 0.5,
    setFeedbackVolume: jest.fn().mockResolvedValue(undefined),
    flashcardAudioVolume: 1, flashcardAudioVolumeHydrated: true,
    setFlashcardAudioVolume: jest.fn().mockResolvedValue(undefined),
    theme: "light", quotesEnabled: true, learningRemindersEnabled: false,
    learningReminderAutomaticEnabled: true, learningReminderManualHour: 12,
    toggleQuotesEnabled: jest.fn().mockResolvedValue(undefined),
    setLearningReminderAutomaticEnabled: jest.fn().mockResolvedValue(undefined),
    toggleLearningRemindersEnabled: jest.fn().mockResolvedValue(undefined),
    setLearningReminderManualHour: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  (useSettings as jest.Mock).mockReturnValue(value);
  return value;
}

it("keeps the reactions switch inverted when pressing its description", async () => {
  const value = settings();
  const screen = render(<AppearanceSection />);
  expect(screen.getByRole("switch", { name: "settings.appearance.disableReactions.title" })).toHaveAccessibilityState({ checked: false });
  fireEvent.press(screen.getByText("settings.appearance.disableReactions.subtitle"));
  await waitFor(() => expect(value.toggleQuotesEnabled).toHaveBeenCalledTimes(1));
});

it.each([false, true])("toggles reminders from the title and description when enabled=%s", async (enabled) => {
  const value = settings({ learningRemindersEnabled: enabled });
  const screen = render(<LearningSection />);
  for (const text of ["settings.learning.reminders.title", "settings.learning.reminders.shortSubtitle"]) {
    value.toggleLearningRemindersEnabled.mockClear();
    fireEvent.press(screen.getByText(text));
    await waitFor(() => expect(value.toggleLearningRemindersEnabled).toHaveBeenCalledTimes(1));
  }
});

it("blocks the entire automatic reminders row when reminders are off", () => {
  const value = settings();
  const screen = render(<LearningSection />);
  const row = screen.getByRole("switch", { name: "settings.learning.reminders.automatic.title" });
  expect(row).toBeDisabled();
  fireEvent.press(screen.getByText("settings.learning.reminders.automatic.subtitle"));
  expect(value.setLearningReminderAutomaticEnabled).not.toHaveBeenCalled();
});

it("commits the manual hour without toggling either reminder switch", async () => {
  const value = settings({ learningRemindersEnabled: true, learningReminderAutomaticEnabled: false });
  const screen = render(<LearningSection />);
  fireEvent(screen.getByTestId("learning-reminder-manual-hour-slider"), "slidingComplete", 17);
  await waitFor(() => expect(value.setLearningReminderManualHour).toHaveBeenCalledWith(17));
  expect(value.toggleLearningRemindersEnabled).not.toHaveBeenCalled();
  expect(value.setLearningReminderAutomaticEnabled).not.toHaveBeenCalled();
});


it("keeps effects and flashcard volume independent and cancels an older debounced value on commit", async () => {
  const value = settings();
  const screen = render(<AppearanceSection />);
  expect(screen.getByTestId("effects-volume-slider").props.value).toBe(0.5);
  expect(screen.getByTestId("flashcard-audio-volume-slider").props.value).toBe(1);
  fireEvent(screen.getByTestId("effects-volume-slider"), "valueChange", 0.2);
  await act(async () => { jest.advanceTimersByTime(180); });
  expect(value.setFeedbackVolume).toHaveBeenLastCalledWith(0.2);
  expect(value.setFlashcardAudioVolume).not.toHaveBeenCalled();
  fireEvent(screen.getByTestId("flashcard-audio-volume-slider"), "valueChange", 0.7);
  fireEvent(screen.getByTestId("flashcard-audio-volume-slider"), "slidingComplete", 0);
  await act(async () => { jest.advanceTimersByTime(180); });
  expect(value.setFlashcardAudioVolume).toHaveBeenCalledTimes(1);
  expect(value.setFlashcardAudioVolume).toHaveBeenLastCalledWith(0);
  expect(value.setFeedbackVolume).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("flashcard-audio-volume-slider").props.accessibilityValueText).toBe("0%");
});
