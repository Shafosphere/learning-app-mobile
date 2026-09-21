import BoxSkin from "@/src/components/Box/Skin/BoxSkin";
import { Image } from "expo-image";
import { type Face } from "@/src/components/Box/Skin/boxFaces";
import { useActivePopup } from "@/src/contexts/PopupContext";
import { useQuote } from "@/src/contexts/QuoteContext";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Animated, Easing, type AppStateStatus, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { getFaceForPopup, getFaceForQuote, resolveNavbarMascotFace } from "./navbarMascotFaces";

type NavbarMascotProps = { tapReaction: { id: number; rage: boolean } };
const SHADOW_SOURCE = require("@/assets/illustrations/mascot-box/body/shadow.svg");
const MOTION_DURATION_SCALE = 1.33;

export default function NavbarMascot({ tapReaction }: NavbarMascotProps) {
  const popup = useActivePopup();
  const { quote, isVisible } = useQuote();
  const reduceMotion = useReducedMotion();
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tapFace, setTapFace] = useState<Face | null>(null);
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      setAppActive(state === "active");
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => () => {
    if (tapTimer.current) clearTimeout(tapTimer.current);
  }, []);

  useEffect(() => {
    if (!tapReaction.id) return;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    setTapFace(tapReaction.rage ? "angry" : "blushed");
    if (!appActive) return;
    tapTimer.current = setTimeout(() => setTapFace(null), tapReaction.rage ? 2800 : 1200);
    return () => { if (tapTimer.current) clearTimeout(tapTimer.current); };
  }, [appActive, tapReaction]);

  const face = resolveNavbarMascotFace({
    popup: popup ? { color: popup.color } : null,
    quote: isVisible && quote ? { id: quote.id, category: quote.category } : null,
    tapFace,
  });
  const reactionFace = popup ? getFaceForPopup(popup.color) : isVisible && quote ? getFaceForQuote(quote.id, quote.category) : tapFace;
  const reactionId = popup ? `popup-${popup.id}` : quote ? `quote-${quote.id}` : tapFace ? `tap-${tapReaction.id}` : "idle";

  const resetTransform = useCallback(() => {
    translateY.setValue(0); scale.setValue(1); rotate.setValue(0);
  }, [rotate, scale, translateY]);

  useEffect(() => {
    if (reduceMotion || !appActive) { resetTransform(); return; }
    if (!reactionFace) {
      const idle = Animated.loop(Animated.sequence([
        Animated.timing(translateY, { toValue: -2, duration: 900 * MOTION_DURATION_SCALE, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 900 * MOTION_DURATION_SCALE, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
      idle.start();
      return () => idle.stop();
    }
    const isAngry = reactionFace === "angry";
    const down = reactionFace === "sad" || reactionFace === "crying";
    const tilt = reactionFace === "blushed" || down;
    const sequence = isAngry
      ? Animated.sequence([Animated.timing(rotate, { toValue: 5, duration: 80 * MOTION_DURATION_SCALE, useNativeDriver: true }), Animated.timing(rotate, { toValue: -5, duration: 100 * MOTION_DURATION_SCALE, useNativeDriver: true }), Animated.timing(rotate, { toValue: 0, duration: 100 * MOTION_DURATION_SCALE, useNativeDriver: true })])
      : Animated.parallel([
          Animated.sequence([Animated.timing(translateY, { toValue: down ? 3 : -3, duration: 130 * MOTION_DURATION_SCALE, useNativeDriver: true }), Animated.timing(translateY, { toValue: 0, duration: 220 * MOTION_DURATION_SCALE, useNativeDriver: true })]),
          Animated.sequence([Animated.timing(scale, { toValue: down ? 0.98 : 1.06, duration: 130 * MOTION_DURATION_SCALE, useNativeDriver: true }), Animated.timing(scale, { toValue: 1, duration: 220 * MOTION_DURATION_SCALE, useNativeDriver: true })]),
          ...(tilt ? [Animated.sequence([Animated.timing(rotate, { toValue: down ? -5 : 4, duration: 130 * MOTION_DURATION_SCALE, useNativeDriver: true }), Animated.timing(rotate, { toValue: 0, duration: 220 * MOTION_DURATION_SCALE, useNativeDriver: true })])] : []),
        ]);
    sequence.start();
    return () => sequence.stop();
  }, [appActive, reactionFace, reactionId, reduceMotion, resetTransform, rotate, scale, translateY]);

  const animatedStyle = useMemo(() => ({ transform: [{ scale: (60 / 115) * 1.05 }, { rotate: "-5deg" }, { translateY }, { scale }, { rotate: rotate.interpolate({ inputRange: [-5, 5], outputRange: ["-5deg", "5deg"] }) }] }), [rotate, scale, translateY]);
  const shadowScale = translateY.interpolate({
    inputRange: [-3, 0, 3],
    outputRange: [0.94, 1, 1],
    extrapolate: "clamp",
  });
  return (
    <View style={{ width: 60, height: 64, position: "relative" }}>
      <Animated.View style={{ position: "absolute", width: 54, height: 13, left: 3, top: 54, opacity: 0.25, transform: [{ scaleX: shadowScale }] }}>
        <Image source={SHADOW_SOURCE} contentFit="contain" style={{ width: "100%", height: "100%" }} />
      </Animated.View>
      <Animated.View style={[{ position: "absolute", left: -27.5, top: -29 }, animatedStyle]}>
        <BoxSkin wordCount={40} face={face} showFace accessible={false} cardVariant="logo" />
      </Animated.View>
    </View>
  );
}
