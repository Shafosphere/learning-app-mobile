import { createContext, useContext, useLayoutEffect } from "react";

// Each focused screen owns its suppression until its layout changes or it leaves.
export const QuoteSuppressionContext = createContext<() => () => void>(() => () => {});

export function useQuoteSuppression(suppressed: boolean) {
  const suppressQuotes = useContext(QuoteSuppressionContext);
  useLayoutEffect(() => {
    if (suppressed) return suppressQuotes();
  }, [suppressed, suppressQuotes]);
}
