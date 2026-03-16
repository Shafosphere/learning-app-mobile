import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "debug.dbInitErrorScreenOverride";

type Listener = (enabled: boolean) => void;

const listeners = new Set<Listener>();

function notifyListeners(enabled: boolean) {
  listeners.forEach((listener) => {
    try {
      listener(enabled);
    } catch (error) {
      console.warn("[dbInitDebugOverride] listener failed", error);
    }
  });
}

export function subscribeDbInitDebugOverride(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function isDbInitDebugOverrideEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEY)) === "1";
  } catch (error) {
    console.warn("[dbInitDebugOverride] failed to read flag", error);
    return false;
  }
}

export async function enableDbInitDebugOverride(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, "1");
  notifyListeners(true);
}

export async function clearDbInitDebugOverride(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  notifyListeners(false);
}
