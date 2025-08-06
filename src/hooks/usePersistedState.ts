// src/hooks/usePersistedState.ts
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => Promise<void>] {
  const [state, setState] = useState<T>(defaultValue);

  useEffect(() => {
    async function load() {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw != null) {
          setState(JSON.parse(raw) as T);
        }
      } catch (e) {
        console.log(`Błąd odczytu ${key}:`, e);
      }
    }
    load();
  }, [key]);

  const setPersisted = useCallback(
    async (value: T) => {
      try {
        setState(value); 
        await AsyncStorage.setItem(key, JSON.stringify(value)); 
      } catch (e) {
        console.log(`Błąd zapisu ${key}:`, e);
      }
    },
    [key]
  );

  return [state, setPersisted];
}
