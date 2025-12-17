import { useQuote } from "@/src/contexts/QuoteContext";
import { useEffect, useRef } from "react";

export default function QuoteSystemInitializer() {
    const { showQuote } = useQuote();
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        // Small delay to let the app settle/splash screen hide
        setTimeout(() => {
            // 50% chance to show a startup quote, or always? 
            // User didn't specify probability, so let's make it always for now to maximize visibility, 
            // or maybe check some settings. For now, always show 'startup'.
            showQuote("startup");
        }, 1500);
    }, [showQuote]);

    return null;
}
