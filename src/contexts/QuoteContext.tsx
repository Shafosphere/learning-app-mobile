import { Quote, QuoteCategory, QUOTES } from "@/src/constants/quotes";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSettings } from "./SettingsContext";

export interface QuoteTriggerRequest {
  trigger: string;
  category: QuoteCategory;
  cooldownMs?: number;
  probability?: number;
  respectGlobalCooldown?: boolean;
}

const GLOBAL_QUOTE_COOLDOWN_MS = 60 * 1000; // max 1 visible quote per minute
const GLOBAL_COOLDOWN_EXEMPT_CATEGORIES: QuoteCategory[] = ["box_spam"];

const isDev = typeof __DEV__ !== "undefined" ? __DEV__ : true;
const logQuote = (...args: unknown[]) => {
  if (isDev) console.log("[Quote]", ...args);
};

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
  const { quotesEnabled } = useSettings();
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
    logQuote("show", { category, text: candidate.text });
    setQuote(candidate);
    setIsVisible(true);
  }, []);

  const triggerQuote = useCallback(
    (request: QuoteTriggerRequest) => {
      if (!quotesEnabled) {
        logQuote("skip: quotes disabled", { trigger: request.trigger, category: request.category });
        return;
      }

      const {
        trigger,
        category,
        cooldownMs = 5 * 60 * 1000,
        probability = 1,
        respectGlobalCooldown = true,
      } = request;

      const isGlobalCooldownExempt =
        GLOBAL_COOLDOWN_EXEMPT_CATEGORIES.includes(category);

      const roll = Math.random();
      if (probability < 1 && roll > probability) {
        logQuote("skip: probability roll", { trigger, category, probability, roll: Number(roll.toFixed(3)) });
        return;
      }

      const now = Date.now();

      if (
        respectGlobalCooldown &&
        !isGlobalCooldownExempt &&
        now - lastQuoteTimestampRef.current < GLOBAL_QUOTE_COOLDOWN_MS
      ) {
        logQuote("skip: global cooldown", {
          trigger,
          category,
          elapsedMs: now - lastQuoteTimestampRef.current,
          remainingMs: GLOBAL_QUOTE_COOLDOWN_MS - (now - lastQuoteTimestampRef.current),
        });
        return;
      }

      const lastTriggerTs = triggerTimestampsRef.current[trigger] ?? 0;
      if (cooldownMs > 0 && now - lastTriggerTs < cooldownMs) {
        logQuote("skip: trigger cooldown", {
          trigger,
          category,
          elapsedMs: now - lastTriggerTs,
          remainingMs: cooldownMs - (now - lastTriggerTs),
        });
        return;
      }

      triggerTimestampsRef.current[trigger] = now;
      if (respectGlobalCooldown && !isGlobalCooldownExempt) {
        lastQuoteTimestampRef.current = now;
      }

      logQuote("fire", { trigger, category, cooldownMs, respectGlobalCooldown });
      showQuote(category);
    },
    [quotesEnabled, showQuote]
  );

  const hideQuote = useCallback(() => {
    logQuote("hide");
    setIsVisible(false);
  }, []);

  useEffect(() => {
    if (!quotesEnabled) {
      setIsVisible(false);
    }
  }, [quotesEnabled]);

  return (
    <QuoteContext.Provider
      value={{ quote, isVisible, showQuote, triggerQuote, hideQuote }}
    >
      {children}
    </QuoteContext.Provider>
  );
};

export const useQuote = () => useContext(QuoteContext);
