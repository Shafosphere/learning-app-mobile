import AsyncStorage from "@react-native-async-storage/async-storage";

export type OnboardingCheckpoint =
  | "language_required"
  | "native_language_required"
  | "beta_required"
  | "leitner_required"
  | "pin_required"
  | "activate_required"
  | "course_entry_settings_required"
  | "done";

type OnboardingCheckpointListener = (checkpoint: OnboardingCheckpoint) => void;

const STORAGE_KEY = "@onboarding_checkpoint_v1";
const ONBOARDING_COACHMARK_STORAGE_KEYS = [
  "@course_pin_intro_seen_v1",
  "@course_activate_intro_seen_v1",
  "@course_entry_settings_intro_seen_v1",
  "@review_courses_intro_seen_v1",
  "@review_flashcards_intro_seen_v1",
  "@flashcards_intro_seen_v1",
] as const;
const listeners = new Set<OnboardingCheckpointListener>();

function notifyListeners(checkpoint: OnboardingCheckpoint): void {
  const dispatch = () => {
    listeners.forEach((listener) => {
      try {
        listener(checkpoint);
      } catch (error) {
        console.warn("[OnboardingCheckpoint] Listener failed", error);
      }
    });
  };

  // Defer notifications to avoid cross-component state updates in the same render cycle.
  if (typeof queueMicrotask === "function") {
    queueMicrotask(dispatch);
    return;
  }

  setTimeout(dispatch, 0);
}

export function subscribeOnboardingCheckpoint(
  listener: OnboardingCheckpointListener
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function getOnboardingCheckpoint(): Promise<
  OnboardingCheckpoint | null
> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    if (
      value === "language_required" ||
      value === "native_language_required" ||
      value === "beta_required" ||
      value === "leitner_required" ||
      value === "pin_required" ||
      value === "activate_required" ||
      value === "course_entry_settings_required" ||
      value === "done"
    ) {
      return value;
    }
    // The former single welcome screen is now the permanent Leitner intro.
    if (value === "welcome_required") {
      return "leitner_required";
    }
    return null;
  } catch (error) {
    console.warn("[OnboardingCheckpoint] Failed to read", error);
    return null;
  }
}

export async function setOnboardingCheckpoint(
  checkpoint: OnboardingCheckpoint
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, checkpoint);
  } catch (error) {
    console.warn("[OnboardingCheckpoint] Failed to write", error);
  } finally {
    notifyListeners(checkpoint);
  }
}

export async function markAllOnboardingCoachmarksSeen(): Promise<void> {
  try {
    await AsyncStorage.multiSet(
      ONBOARDING_COACHMARK_STORAGE_KEYS.map((key) => [key, "1"])
    );
  } catch (error) {
    console.warn("[OnboardingCheckpoint] Failed to mark coachmarks seen", error);
  }
}
