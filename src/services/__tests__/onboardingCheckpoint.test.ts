import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  markAllOnboardingCoachmarksSeen,
  setOnboardingCheckpoint,
  subscribeOnboardingCheckpoint,
} from "@/src/services/onboardingCheckpoint";

describe("onboardingCheckpoint", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it("marks every main onboarding coachmark as seen", async () => {
    await markAllOnboardingCoachmarksSeen();

    expect(AsyncStorage.multiSet).toHaveBeenCalledWith([
      ["@course_pin_intro_seen_v1", "1"],
      ["@course_activate_intro_seen_v1", "1"],
      ["@course_entry_settings_intro_seen_v1", "1"],
      ["@review_courses_intro_seen_v1", "1"],
      ["@review_flashcards_intro_seen_v1", "1"],
      ["@flashcards_intro_seen_v1", "1"],
    ]);
  });

  it("persists done and notifies subscribers", async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeOnboardingCheckpoint(listener);

    await setOnboardingCheckpoint("done");
    await Promise.resolve();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@onboarding_checkpoint_v1",
      "done",
    );
    expect(listener).toHaveBeenCalledWith("done");

    unsubscribe();
  });
});
