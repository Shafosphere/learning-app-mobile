import { QuoteCategory } from "@/src/constants/quotes";
import { useQuote } from "@/src/contexts/QuoteContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import React, { useEffect, useMemo, useRef } from "react";
import {
    Animated,
    Easing,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStyles } from "./QuoteBubble-styles";

const NAVBAR_HEIGHT = 50;
const TOP_OFFSET_ADJUSTMENT = 24; // Check popup-styles POPUP_GAP

const CATEGORY_COLORS: Record<QuoteCategory, "my_green" | "my_red" | "my_yellow" | "my_blue"> = {
    win: "my_green",
    loss: "my_red",
    startup: "my_yellow",
    general: "my_yellow",
};

export default function QuoteBubble() {
    const { quote, isVisible, hideQuote } = useQuote();
    const styles = useStyles();
    const { colors } = useSettings();
    const insets = useSafeAreaInsets();

    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.94)).current; // Start slightly smaller like popup
    const translateY = useRef(new Animated.Value(-18)).current; // Start higher like popup

    // Calculate top offset to position below the navbar logo
    const topOffset = useMemo(() => {
        const statusBarHeight =
            Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;
        const topPadding = Math.max(statusBarHeight, insets.top);
        // Navbar height + top padding + some offset
        return topPadding + NAVBAR_HEIGHT + TOP_OFFSET_ADJUSTMENT;
    }, [insets.top]);

    useEffect(() => {
        if (isVisible) {
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    damping: 16,
                    stiffness: 180,
                    mass: 0.6,
                    useNativeDriver: true,
                }),
                Animated.spring(scale, {
                    toValue: 1,
                    damping: 16,
                    stiffness: 180,
                    mass: 0.6,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 220,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 220,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: -12,
                    duration: 220,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(scale, {
                    toValue: 0.96,
                    duration: 220,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isVisible, opacity, scale, translateY]);

    if (!isVisible || !quote) return null;

    const bubbleColorKey = CATEGORY_COLORS[quote.category] || "my_yellow";
    // @ts-ignore
    const bubbleColor = colors[bubbleColorKey] || colors.my_yellow;

    return (
        <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}>
            {/* Backdrop - invisible but catches touches to dismiss */}
            <TouchableWithoutFeedback onPress={hideQuote}>
                <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>

            {/* Bubble Container */}
            <Animated.View
                style={[
                    styles.container,
                    {
                        top: topOffset,
                        opacity,
                        transform: [{ translateY }, { scale }],
                    },
                ]}
            >
                <View style={[styles.tail, { backgroundColor: bubbleColor }]} />
                <TouchableOpacity
                    style={[styles.bubble, { backgroundColor: bubbleColor }]}
                    onPress={hideQuote}
                    activeOpacity={0.9}
                >
                    <Text style={styles.text}>{quote.text}</Text>
                    {quote.author ? (
                        <Text style={styles.author}>- {quote.author}</Text>
                    ) : null}
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}
