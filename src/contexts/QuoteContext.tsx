import { Quote, QuoteCategory, QUOTES } from "@/src/constants/quotes";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

export interface QuoteTriggerRequest {
  trigger: string;
  category: QuoteCategory;
  cooldownMs?: number;
  probability?: number;
  respectGlobalCooldown?: boolean;
}

const GLOBAL_QUOTE_COOLDOWN_MS = 1 * 1000; // avoid spamming quotes across triggers

interface QuoteContextType {
  quote: Quote | null;
  isVisible: boolean;
  showQuote: (category: QuoteCategory) => void;
  triggerQuote: (request: QuoteTriggerRequest) => void;
  hideQuote: () => void;
}

const QuoteContext = createContext<QuoteContextType>({
  quote: null,
  isVisible: false,
  showQuote: () => {},
  triggerQuote: () => {},
  hideQuote: () => {},
});

export const QuoteProvider = ({ children }: { children: ReactNode }) => {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const lastQuoteTimestampRef = useRef<number>(0);
  const triggerTimestampsRef = useRef<Record<string, number>>({});
  const lastCategoryQuoteRef =
    useRef<Partial<Record<QuoteCategory, Quote | null>>>({});

  const showQuote = useCallback((category: QuoteCategory) => {
    const availableQuotes = QUOTES.filter((q) => q.category === category);

    // Fallback to general if no quotes found for category
    const pool =
      availableQuotes.length > 0
        ? availableQuotes
        : QUOTES.filter((q) => q.category === "general");

    if (pool.length === 0) return;

    let candidate = pool[Math.floor(Math.random() * pool.length)];
    const lastForCategory = lastCategoryQuoteRef.current[category];

    if (pool.length > 1 && lastForCategory) {
      let safety = 0;
      while (candidate.text === lastForCategory.text && safety < 5) {
        candidate = pool[Math.floor(Math.random() * pool.length)];
        safety += 1;
      }
    }

    lastCategoryQuoteRef.current[category] = candidate;
    setQuote(candidate);
    setIsVisible(true);
  }, []);

  const triggerQuote = useCallback(
    (request: QuoteTriggerRequest) => {
      const {
        trigger,
        category,
        cooldownMs = 5 * 60 * 1000,
        probability = 1,
        respectGlobalCooldown = true,
      } = request;

      if (probability < 1 && Math.random() > probability) {
        return;
      }

      const now = Date.now();

      if (
        respectGlobalCooldown &&
        now - lastQuoteTimestampRef.current < GLOBAL_QUOTE_COOLDOWN_MS
      ) {
        return;
      }

      const lastTriggerTs = triggerTimestampsRef.current[trigger] ?? 0;
      if (cooldownMs > 0 && now - lastTriggerTs < cooldownMs) {
        return;
      }

      triggerTimestampsRef.current[trigger] = now;
      if (respectGlobalCooldown) {
        lastQuoteTimestampRef.current = now;
      }

      showQuote(category);
    },
    [showQuote]
  );

  const hideQuote = useCallback(() => {
    setIsVisible(false);
  }, []);

  return (
    <QuoteContext.Provider
      value={{ quote, isVisible, showQuote, triggerQuote, hideQuote }}
    >
      {children}
    </QuoteContext.Provider>
  );
};

export const useQuote = () => useContext(QuoteContext);
