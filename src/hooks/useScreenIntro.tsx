import LogoMessage from "@/src/components/logoMessage/LogoMessage";
import { IntroMessage } from "@/src/constants/introMessages";
import {
    getOnboardingCheckpoint,
    OnboardingCheckpoint,
} from "@/src/services/onboardingCheckpoint";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

type TriggerStrategy = "on_onboarding" | "post_onboarding";

type UseScreenIntroOptions = {
    messages: IntroMessage[];
    storageKey: string;
    triggerStrategy: TriggerStrategy;
    onCheckpointLoaded?: (checkpoint: OnboardingCheckpoint | null) => void;
    containerStyle?: StyleProp<ViewStyle>;
    floatingOffset?: Partial<{
        top: number;
        bottom: number;
        left: number;
        right: number;
    }>;
};

export function useScreenIntro({
    messages,
    storageKey,
    triggerStrategy,
    onCheckpointLoaded,
    containerStyle,
    floatingOffset = { top: 8, left: 8, right: 8 },
}: UseScreenIntroOptions) {
    const [showIntro, setShowIntro] = useState(false);
    const [introStep, setIntroStep] = useState(0);
    // This state can be used by the screen to determine if it should show certain UI elements
    // that depend on whether the intro is active or not.
    const [isIntroActive, setIsIntroActive] = useState(false);
    const [openGates, setOpenGates] = useState<Record<string, boolean>>({});
    const [awaitingGateStep, setAwaitingGateStep] = useState<number | null>(null);

    // Use a ref to store the latest callback to avoid re-triggering the effect
    // when the consumer passes a new inline function instance on every render.
    const onCheckpointLoadedRef = useRef(onCheckpointLoaded);

    useEffect(() => {
        onCheckpointLoadedRef.current = onCheckpointLoaded;
    }, [onCheckpointLoaded]);

    const defaultOverlay = useMemo<ViewStyle>(
        () => ({
            position: "absolute",
            bottom: "30%",
            left: 0,
            right: 0,
            zIndex: 30,
            elevation: 6,
            paddingHorizontal: 4,
            paddingTop: 8,
        }),
        []
    );

    useEffect(() => {
        let mounted = true;

        async function hydrate() {
            try {
                const [checkpoint, seen] = await Promise.all([
                    getOnboardingCheckpoint(),
                    AsyncStorage.getItem(storageKey),
                ]);

                if (!mounted) return;

                if (onCheckpointLoadedRef.current) {
                    onCheckpointLoadedRef.current(checkpoint);
                }

                const resolvedCheckpoint = checkpoint ?? "pin_required"; // Default assumption if null
                const hasSeenIntro = seen === "1";
                const isDone = resolvedCheckpoint === "done";

                let shouldShow = false;

                if (triggerStrategy === "on_onboarding") {
                    // Show if onboarding is NOT done and intro hasn't been seen yet.
                    if (!isDone && !hasSeenIntro) {
                        shouldShow = true;
                    }
                } else if (triggerStrategy === "post_onboarding") {
                    // Flashcards: defaults to showing if checkpint IS done (meaning we are past onboarding) 
                    // and we haven't seen this specific specific intro yet.
                    if (isDone && !hasSeenIntro) {
                        shouldShow = true;
                    }
                }

                if (shouldShow) {
                    setShowIntro(true);
                    setIsIntroActive(true);
                    setIntroStep(0);
                } else {
                    if (triggerStrategy === "on_onboarding" && !isDone) {
                        setIsIntroActive(true);
                    }
                }

            } catch (error) {
                console.warn("Failed to hydrate intro:", error);
            }
        }

        hydrate();

        return () => {
            mounted = false;
        };
    }, [storageKey, triggerStrategy]); // Removed onCheckpointLoaded from deps

    const handleClose = useCallback(() => {
        setIntroStep((prev) => {
            const next = prev + 1;
            if (next >= messages.length) {
                setShowIntro(false);
                void AsyncStorage.setItem(storageKey, "1");
                return prev;
            }

            const nextMessage = messages[next];
            const gateId = nextMessage?.gateId;

            if (gateId && !openGates[gateId]) {
                setAwaitingGateStep(next);
                return prev;
            }

            return next;
        });
    }, [messages, openGates, storageKey]);

    const unlockGate = useCallback(
        (gateId: string) => {
            setOpenGates((prev) => {
                if (prev[gateId]) return prev;
                return { ...prev, [gateId]: true };
            });

            setAwaitingGateStep((pendingStep) => {
                if (pendingStep === null) return pendingStep;

                const pendingMessage = messages[pendingStep];
                if (pendingMessage?.gateId === gateId) {
                    setIntroStep(pendingStep);
                    return null;
                }

                return pendingStep;
            });
        },
        [messages]
    );

    useEffect(() => {
        if (awaitingGateStep === null) return;

        const gateId = messages[awaitingGateStep]?.gateId;
        if (gateId && openGates[gateId]) {
            setIntroStep(awaitingGateStep);
            setAwaitingGateStep(null);
        }
    }, [awaitingGateStep, messages, openGates]);

    useEffect(() => {
        const nextIndex = introStep + 1;
        const nextMessage = messages[nextIndex];

        if (!nextMessage) return;

        const gateId = nextMessage.gateId;
        const shouldAutoAdvance =
            nextMessage.autoAdvanceOnGate && gateId && openGates[gateId];

        if (shouldAutoAdvance) {
            setIntroStep(nextIndex);
            setAwaitingGateStep(null);
        }
    }, [introStep, messages, openGates]);

    const IntroOverlay = useCallback(() => {
        if (!showIntro || !messages[introStep]) return null;

        // LogoMessage props are 'variant' based or direct title/description.
        // We use direct title/description from our messages array.

        // For screens like Pin/Activate, they used `floating` prop on LogoMessage.
        // For Flashcards, it used a Modal.
        // To unify, we can check if we want a Modal or just a floating View.
        // The original generic hook `useFlashcardsIntro` used a Modal. 
        // `CourseActivateScreen` and `CoursePinScreen` rendered `LogoMessage` directly in the view stack (absolute positioned View).

        // A Modal is generally safer for "overlays" to ensure z-index, but might conflict if the design expects it to be part of the flow.
        // However, the `useFlashcardsIntro` was successfully using Modal.
        // Let's stick to Modal for the "Overlay" concept if it works for all 3. 
        // BUT: In Activate/Pin screens, the overlay was inside the specific screen struct, maybe under some other specific UI?
        // Actually, in ActivateScreen/PinScreen it was: 
        // <View style={styles.introOverlay} pointerEvents="box-none"><LogoMessage ... /></View>
        // This `introOverlay` style usually is absolute fill of the screen container.
        // Using a Modal is cleaner as it breaks out of the flex layout issues.

        return (
            <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]} pointerEvents="box-none">
                <View style={[defaultOverlay, containerStyle]} pointerEvents="box-none">
                    <LogoMessage
                        floating
                        offset={floatingOffset}
                        title={messages[introStep].title}
                        description={messages[introStep].description}
                        onClose={handleClose}
                        closeLabel="Następny komunikat"
                    />
                </View>
            </View>
        );
    }, [showIntro, messages, introStep, defaultOverlay, containerStyle, floatingOffset, handleClose]);

    return {
        IntroOverlay,
        showIntro, // useful if screen needs to blur something etc
        isIntroActive, // useful for button states
        unlockGate,
    };
}
