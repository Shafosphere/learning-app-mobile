import { createContext, useContext } from "react";

// A token per control also handles overlapping/multi-touch interactions.
export const SettingsPagerGestureContext = createContext<
  ((token: object, locked: boolean) => void) | null
>(null);

export const useSettingsPagerGestureLock = () =>
  useContext(SettingsPagerGestureContext);
