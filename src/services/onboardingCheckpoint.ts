import AsyncStorage from "@react-native-async-storage/async-storage";

export type OnboardingCheckpoint =
  | "pin_required"
  | "activate_required"
  | "done";

const STORAGE_KEY = "@onboarding_checkpoint_v1";

export async function getOnboardingCheckpoint(): Promise<
  OnboardingCheckpoint | null
> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    if (
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
  try {
    await AsyncStorage.setItem(STORAGE_KEY, checkpoint);
  } catch (error) {
    console.warn("[OnboardingCheckpoint] Failed to write", error);
  }
}

export async function clearOnboardingCheckpoint(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("[OnboardingCheckpoint] Failed to clear", error);
  }
}
