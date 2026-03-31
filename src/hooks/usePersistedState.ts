// src/hooks/usePersistedState.ts
import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type PersistedStateResult<T> = [T, (value: T) => Promise<void>, boolean];

function usePersistedStateInternal<T>(
  key: string,
  defaultValue: T
): PersistedStateResult<T> {
  const [state, setState] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    async function load() {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw != null) {
          const parsed = JSON.parse(raw) as T;
          stateRef.current = parsed;
          setState(parsed);
        }
      } catch (e) {
        console.log(`Błąd odczytu ${key}:`, e);
      } finally {
        setHydrated(true);
      }
    }
    load();
  }, [key]);

  const setPersisted = useCallback(
    async (value: T) => {
      try {
        if (Object.is(stateRef.current, value)) {
          return;
        }
        stateRef.current = value;
        setState(value);
        await AsyncStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.log(`Błąd zapisu ${key}:`, e);
      }
    },
    [key]
  );

  return [state, setPersisted, hydrated];
}

export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => Promise<void>] {
  const [state, setPersisted] = usePersistedStateInternal(key, defaultValue);
  return [state, setPersisted];
}

export function useHydratedPersistedState<T>(
  key: string,
  defaultValue: T
): PersistedStateResult<T> {
  return usePersistedStateInternal(key, defaultValue);
}
