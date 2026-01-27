import { useEffect } from "react";

export const useAutoResetFlag = (
  flag: boolean,
  reset: () => void,
  delayMs = 1750,
) => {
  useEffect(() => {
    if (!flag) return;
    const timeout = setTimeout(() => reset(), delayMs);
    return () => clearTimeout(timeout);
  }, [flag, reset, delayMs]);
};
