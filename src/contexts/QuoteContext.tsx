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
  showQuote: () => { },
  triggerQuote: () => { },
  hideQuote: () => { },
});

export const QuoteProvider = ({ children }: { children: ReactNode }) => {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const lastQuoteTimestampRef = useRef<number>(0);
  const triggerTimestampsRef = useRef<Record<string, number>>({});

  // Track state for sequential categories: { [category]: { currentIndex: number, lastUpdate: number } }
  const sequenceStateRef = useRef<Record<string, { currentIndex: number; lastUpdate: number }>>({});

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

    // Check if this category has sequential quotes
    const isSequential = pool.some((q) => q.sequenceIndex !== undefined);
    let candidate: Quote;

    if (isSequential) {
      // Sort by sequence index to be safe
      pool.sort((a, b) => (a.sequenceIndex ?? 0) - (b.sequenceIndex ?? 0));

      const now = Date.now();
      const SEQ_RESET_MS = 60 * 1000; // Reset sequence if not triggered for 60s

      let state = sequenceStateRef.current[category];
      if (!state || (now - state.lastUpdate > SEQ_RESET_MS)) {
        state = { currentIndex: 0, lastUpdate: now };
      }

      // Ensure index is within bounds (stay at last item vs loop? User request implied "stop it... seriously stop", implies sticking at end or unique end)
      // Let's simple clamp to max index for now, or loop? The user didn't specify looping, but usually spam messages loop or stay at "STOP".
      // Let's use modulus to loop for now, or clamp. "last one" being "seriously stop" sounds like it should be final.
      // BUT user said "etc etc", implying a flow. Let's clamp to the last message if it's "Stop", or maybe let it stick there.
      // Actually, standard behavior for "don't touch" is usually: 1, 2, 3, 3, 3... or 1, 2, 3, 1, 2, 3.
      // Given the user example "co tak go klikasz" -> "zostaw" -> "przestań", let's clamp.

      if (state.currentIndex >= pool.length) {
        state.currentIndex = pool.length - 1;
      }

      candidate = pool[state.currentIndex];

      // Advance index for next time (unless at end? Let's loop or hold? Let's hold at end for 'spam' categories, loop for others?)
      // For box_spam, repeated "STOP" makes sense.
      if (state.currentIndex < pool.length - 1) {
        state.currentIndex++;
      }

      state.lastUpdate = now;
      sequenceStateRef.current[category] = state;

    } else {
      // Random logic (existing)
      candidate = pool[Math.floor(Math.random() * pool.length)];
      const lastForCategory = lastCategoryQuoteRef.current[category];

      if (pool.length > 1 && lastForCategory) {
        let safety = 0;
        while (candidate.text === lastForCategory.text && safety < 5) {
          candidate = pool[Math.floor(Math.random() * pool.length)];
          safety += 1;
        }
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
