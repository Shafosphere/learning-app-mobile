import { useCallback, useEffect, useMemo } from "react";

import i18n, {
  normalizeNativeLanguage,
  normalizeUiLanguage,
  resolveLanguage,
  resolveSystemLanguage,
  type NativeLanguage,
  type UiLanguage,
} from "@/src/i18n";
import { useHydratedPersistedState } from "@/src/hooks/usePersistedState";

export function useLocaleSettings() {
  const [uiLanguageRaw, setUiLanguageState, uiLanguageHydrated] =
    useHydratedPersistedState<string>("uiLanguage", resolveSystemLanguage());
  const uiLanguage = useMemo<UiLanguage>(
    () => normalizeUiLanguage(uiLanguageRaw),
    [uiLanguageRaw]
  );
  const [nativeLanguageRaw, setNativeLanguageState] =
    useHydratedPersistedState<string | null>("nativeLanguage", null);
  const nativeLanguage = useMemo<NativeLanguage>(
    () => normalizeNativeLanguage(nativeLanguageRaw, uiLanguage),
    [nativeLanguageRaw, uiLanguage]
  );
  const resolvedLanguage = useMemo(
    () => resolveLanguage(uiLanguage),
    [uiLanguage]
  );

  useEffect(() => {
    if (!uiLanguageHydrated) {
      return;
    }
    void i18n.changeLanguage(resolvedLanguage);
  }, [resolvedLanguage, uiLanguageHydrated]);

  useEffect(() => {
    if (!uiLanguageHydrated) {
      return;
    }
    const normalized = normalizeUiLanguage(uiLanguageRaw);
    if (uiLanguageRaw !== normalized) {
      void setUiLanguageState(normalized);
    }
  }, [uiLanguageHydrated, uiLanguageRaw, setUiLanguageState]);

  useEffect(() => {
    const normalized = normalizeNativeLanguage(nativeLanguageRaw, uiLanguage);
    if (nativeLanguageRaw != null && nativeLanguageRaw !== normalized) {
      void setNativeLanguageState(normalized);
    }
  }, [nativeLanguageRaw, setNativeLanguageState, uiLanguage]);

  const setUiLanguage = useCallback(
    async (value: UiLanguage) => {
      await setUiLanguageState(value);
    },
    [setUiLanguageState]
  );

  const setNativeLanguage = useCallback(
    async (value: NativeLanguage) => {
      await setNativeLanguageState(value);
    },
    [setNativeLanguageState]
  );

  return {
    uiLanguage,
    nativeLanguage,
    resolvedLanguage,
    setUiLanguage,
    setNativeLanguage,
  };
}
