// src/hooks/usePersistedState.ts
import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type PersistedStateResult<T> = [T, (value: T) => Promise<void>, boolean];

function usePersistedStateInternal<T>(
  key: string,
  defaultValue: T,
  propagateErrors = false,
): PersistedStateResult<T> {
  const [state, setState] = useState<T>(defaultValue);
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);

  const persistedRef = useRef(defaultValue);
  const revisionRef = useRef(0);
  const writeQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    const revision = revisionRef.current;
    async function load() {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (active && revisionRef.current === revision && raw != null) {
          const parsed = JSON.parse(raw) as T;
          persistedRef.current = parsed;
          stateRef.current = parsed;
          setState(parsed);
        }
      } catch (e) {
        console.log(`Błąd odczytu ${key}:`, e);
      } finally {
        if (active) setHydrated(true);
      }
    }
    void load();
    return () => { active = false; };
  }, [key]);

  const setPersisted = useCallback(
    async (value: T) => {
      if (Object.is(stateRef.current, value)) {
        return writeQueue.current;
      }
      const revision = ++revisionRef.current;
      stateRef.current = value;
      setState(value);

      const write = writeQueue.current.catch(() => {}).then(async () => {
        try {
          await AsyncStorage.setItem(key, JSON.stringify(value));
          persistedRef.current = value;
        } catch (error) {
          // An older failure must not replace a newer pending choice.
          if (propagateErrors && revisionRef.current === revision) {
            stateRef.current = persistedRef.current;
            setState(persistedRef.current);
          }
          if (propagateErrors) throw error;
          console.log(`Błąd zapisu ${key}:`, error);
        }
      });
      writeQueue.current = write;
      return write;
    },
    [key, propagateErrors]
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
  defaultValue: T,
  propagateErrors = false,
): PersistedStateResult<T> {
  return usePersistedStateInternal(key, defaultValue, propagateErrors);
}
