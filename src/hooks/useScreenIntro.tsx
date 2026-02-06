import LogoMessage from "@/src/components/logoMessage/LogoMessage";
import { IntroMessage } from "@/src/constants/introMessages";
import {
    getOnboardingCheckpoint,
    OnboardingCheckpoint,
} from "@/src/services/onboardingCheckpoint";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    useCallback,
    useEffect,
    useRef,
    useState
} from "react";
import {
    Animated,
    Easing,
    Keyboard,
    KeyboardEvent,
    Platform,
    StyleProp,
    StyleSheet,
    useWindowDimensions,
    View,
    ViewStyle
} from "react-native";

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

    // Animation value for keyboard offset
    const keyboardHeightAnim = useRef(new Animated.Value(0)).current;

    const { height: windowHeight } = useWindowDimensions();

    // Use a ref to store the latest callback to avoid re-triggering the effect
    // when the consumer passes a new inline function instance on every render.
    const onCheckpointLoadedRef = useRef(onCheckpointLoaded);

    useEffect(() => {
        onCheckpointLoadedRef.current = onCheckpointLoaded;
    }, [onCheckpointLoaded]);

    // Base position (when no keyboard)
    const baseBottom = windowHeight * 0.15;

    useEffect(() => {
        const handleShow = (event: KeyboardEvent) => {
            const endHeight = event.endCoordinates.height;
            // Calculate how much we need to lift the bubble to be above the keyboard
            // We want final bottom = endHeight + 16.
            // Current bottom is baseBottom.
            // So lift = (endHeight + 16) - baseBottom.
            // If baseBottom is already higher than keyboard + 16, lift is 0.
            const lift = Math.max(0, endHeight + 16 - baseBottom);

            Animated.timing(keyboardHeightAnim, {
                toValue: lift,
                duration: Platform.OS === "ios" ? event.duration : 250,
                easing: Platform.OS === "ios" ? Easing.out(Easing.ease) : undefined,
                useNativeDriver: false, // Layout properties cannot use native driver
            }).start();
        };

        const handleHide = (event: KeyboardEvent) => {
            Animated.timing(keyboardHeightAnim, {
                toValue: 0,
                duration: Platform.OS === "ios" ? event.duration : 250,
                easing: Platform.OS === "ios" ? Easing.out(Easing.ease) : undefined,
                useNativeDriver: false,
            }).start();
        };

        const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

        const showSub = Keyboard.addListener(showEvent, handleShow);
        const hideSub = Keyboard.addListener(hideEvent, handleHide);

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, [keyboardHeightAnim, baseBottom]);

    // Final animated bottom position: baseBottom + lift
    const animatedBottom = Animated.add(keyboardHeightAnim, baseBottom);

    const maxBodyHeight = windowHeight * 0.4; // Simplified constant max height to avoid complex re-renders during animation

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

        return (
            <View
                style={[StyleSheet.absoluteFill, { zIndex: 999 }]}
                pointerEvents="box-none"
            >
                <Animated.View
                    style={[
                        {
                            position: "absolute",
                            left: 0,
                            right: 0,
                            zIndex: 30,
                            elevation: 6,
                            paddingHorizontal: 4,
                            paddingTop: 8,
                            bottom: animatedBottom,
                        },
                        containerStyle,
                    ]}
                    pointerEvents="box-none"
                >
                    <LogoMessage
                        style={{
                            marginTop: floatingOffset?.top ?? 8,
                            marginLeft: floatingOffset?.left ?? 8,
                            marginRight: floatingOffset?.right ?? 8,
                        }}
                        maxBodyHeight={maxBodyHeight}
                        title={messages[introStep].title}
                        description={messages[introStep].description}
                        onClose={handleClose}
                        closeLabel="Następny komunikat"
                    />
                </Animated.View>
            </View>
        );
    }, [
        showIntro,
        messages,
        introStep,
        containerStyle,
        floatingOffset,
        handleClose,
        animatedBottom,
        maxBodyHeight,
    ]);

    return {
        IntroOverlay,
        showIntro, // useful if screen needs to blur something etc
        isIntroActive, // useful for button states
        unlockGate,
    };
}
