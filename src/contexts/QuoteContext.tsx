import { Quote, QuoteCategory, QUOTES } from "@/src/constants/quotes";
import { createContext, ReactNode, useCallback, useContext, useState } from "react";

interface QuoteContextType {
    quote: Quote | null;
    isVisible: boolean;
    showQuote: (category: QuoteCategory) => void;
    hideQuote: () => void;
}

const QuoteContext = createContext<QuoteContextType>({
    quote: null,
    isVisible: false,
    showQuote: () => { },
    hideQuote: () => { },
});

export const QuoteProvider = ({ children }: { children: ReactNode }) => {
    const [quote, setQuote] = useState<Quote | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    const showQuote = useCallback((category: QuoteCategory) => {
        const availableQuotes = QUOTES.filter((q) => q.category === category);

        // Fallback to general if no quotes found for category
        const pool = availableQuotes.length > 0
            ? availableQuotes
            : QUOTES.filter((q) => q.category === "general");

        if (pool.length === 0) return;

        const randomQuote = pool[Math.floor(Math.random() * pool.length)];
        setQuote(randomQuote);
        setIsVisible(true);
    }, []);

    const hideQuote = useCallback(() => {
        setIsVisible(false);
    }, []);

    return (
        <QuoteContext.Provider value={{ quote, isVisible, showQuote, hideQuote }}>
            {children}
        </QuoteContext.Provider>
    );
};

export const useQuote = () => useContext(QuoteContext);
