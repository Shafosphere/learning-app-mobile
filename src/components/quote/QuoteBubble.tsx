import Popup, { PopupColor } from "@/src/components/popup/popup";
import { QuoteCategory } from "@/src/constants/quotes";
import { useQuote } from "@/src/contexts/QuoteContext";
import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, TouchableWithoutFeedback, View } from "react-native";

const QUOTE_DURATION_MS = 3500;
const MIN_VISIBLE_MS_BEFORE_DISMISS = 600;

const CATEGORY_COLORS: Record<QuoteCategory, PopupColor> = {
    win: "my_green",
    streak: "my_green",
    comeback: "my_green",
    loss: "my_red",
    startup: "my_yellow",
    first_time: "my_yellow",
    return: "my_yellow",
    long_think: "my_yellow",
    box_spam: "my_yellow",
    easter: "my_yellow",
    hint: "my_yellow",
    general: "my_yellow",
};

export default function QuoteBubble() {
    const { quote, isVisible, hideQuote } = useQuote();
    const lastShowTsRef = useRef<number>(0);

    const popupMessage = useMemo(() => {
        if (!quote) return "";
        return quote.author ? `${quote.text}\n- ${quote.author}` : quote.text;
    }, [quote]);

    useEffect(() => {
        if (isVisible) {
            lastShowTsRef.current = Date.now();
        }
    }, [isVisible]);

    if (!isVisible || !quote) return null;

    const popupColor = CATEGORY_COLORS[quote.category] ?? "my_yellow";

    const handleDismiss = () => {
        const now = Date.now();
        if (now - lastShowTsRef.current < MIN_VISIBLE_MS_BEFORE_DISMISS) {
            return;
        }
        hideQuote();
    };

    return (
        <TouchableWithoutFeedback onPress={handleDismiss}>
            <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}>
                <Popup
                    key={popupMessage}
                    message={popupMessage}
                    color={popupColor}
                    duration={QUOTE_DURATION_MS}
                    onHide={hideQuote}
                />
            </View>
        </TouchableWithoutFeedback>
    );
}
