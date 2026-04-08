import AsyncStorage from "@react-native-async-storage/async-storage";

export type OnboardingCheckpoint =
  | "language_required"
  | "pin_required"
  | "activate_required"
  | "done";

type OnboardingCheckpointListener = (checkpoint: OnboardingCheckpoint) => void;

const STORAGE_KEY = "@onboarding_checkpoint_v1";
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
      value === "pin_required" ||
      value === "activate_required" ||
      value === "done"
    ) {
      return value;
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
  notifyListeners(checkpoint);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, checkpoint);
  } catch (error) {
    console.warn("[OnboardingCheckpoint] Failed to write", error);
  }
}
