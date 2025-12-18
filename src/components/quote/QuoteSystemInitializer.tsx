import { useQuote } from "@/src/contexts/QuoteContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { useEffect, useRef } from "react";

const LAST_ACTIVE_TS_KEY = "@quote_last_active_ts_v1";
const FIRST_TIME_KEY = "@quote_first_time_shown_v1";
const RETURN_AFTER_BREAK_MS = 6 * 60 * 60 * 1000; // 6h przerwy
const STARTUP_DELAY_MS = 1500;

export default function QuoteSystemInitializer() {
    const { triggerQuote } = useQuote();
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        let startupTimeout: ReturnType<typeof setTimeout> | null = null;

        const persistLastActive = async () => {
            try {
                await AsyncStorage.setItem(LAST_ACTIVE_TS_KEY, String(Date.now()));
            } catch (error) {
                console.warn("[QuoteSystemInitializer] failed to persist last active", error);
            }
        };

        void (async () => {
            const now = Date.now();

            try {
                const [lastActiveRaw, firstTimeRaw] = await Promise.all([
                    AsyncStorage.getItem(LAST_ACTIVE_TS_KEY),
                    AsyncStorage.getItem(FIRST_TIME_KEY),
                ]);

                const lastActive = lastActiveRaw ? Number(lastActiveRaw) : null;
                const isFirstTime = firstTimeRaw !== "1";

                if (isFirstTime) {
                    triggerQuote({
                        trigger: "quote_first_time",
                        category: "first_time",
                        respectGlobalCooldown: false,
                        cooldownMs: 0,
                    });
                    await AsyncStorage.setItem(FIRST_TIME_KEY, "1");
                } else if (lastActive && now - lastActive > RETURN_AFTER_BREAK_MS) {
                    triggerQuote({
                        trigger: "quote_return_after_break",
                        category: "return",
                        respectGlobalCooldown: false,
                        cooldownMs: 0,
                    });
                } else {
                    startupTimeout = setTimeout(() => {
                        triggerQuote({
                            trigger: "quote_startup",
                            category: "startup",
                            respectGlobalCooldown: false,
                            cooldownMs: 60 * 60 * 1000, // max raz na godzinę
                        });
                    }, STARTUP_DELAY_MS);
                }
            } catch (error) {
                console.warn("[QuoteSystemInitializer] failed to init quotes", error);
            } finally {
                await persistLastActive();
            }
        })();

        const appStateListener = AppState.addEventListener("change", (state) => {
            if (state !== "active") {
                void persistLastActive();
            }
        });

        return () => {
            if (startupTimeout) {
                clearTimeout(startupTimeout);
            }
            appStateListener.remove();
            void persistLastActive();
        };
    }, [triggerQuote]);

    return null;
}
