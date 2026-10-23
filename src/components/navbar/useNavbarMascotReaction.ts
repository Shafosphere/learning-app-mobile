import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import type { BoxFaceParts } from "@/src/components/Box/Skin/boxFaces";
import {
  pickWeightedNavbarReaction,
  resolveNavbarMascotSource,
  type NavbarPopupReaction,
  type NavbarQuoteReaction,
  type NavbarReactionVariant,
  type NavbarTapPhase,
} from "./navbarMascotFaces";

export type MascotTapReaction = { id: number; count: number; rage: boolean };
type Params = {
  popup: NavbarPopupReaction | null;
  quote: NavbarQuoteReaction | null;
  tapReaction: MascotTapReaction;
  reduceMotion: boolean;
};
const IDLE_VARIANT: NavbarReactionVariant = { id: "idle", face: "nice", faceParts: { mouth: "happy" }, motion: "still" };

export function useNavbarMascotReaction({ popup, quote, tapReaction, reduceMotion }: Params) {
  const [appActive, setAppActive] = useState(AppState.currentState !== "background" && AppState.currentState !== "inactive");
  const [tapPhase, setTapPhase] = useState<NavbarTapPhase | null>(null);
  const [blinking, setBlinking] = useState(false);
  const [picked, setPicked] = useState<{ key: string; variant: NavbarReactionVariant } | null>(null);
  const cache = useRef(new Map<string, NavbarReactionVariant>());
  const latestTapId = useRef(tapReaction.id);
  latestTapId.current = tapReaction.id;
  const backgroundTapId = useRef<number | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      const active = status === "active";
      if (!active) {
        backgroundTapId.current = latestTapId.current;
        setTapPhase(null);
        setBlinking(false);
      }
      setAppActive(active);
    });
    return () => subscription.remove();
  }, []);

  const { id, count, rage } = tapReaction;
  useLayoutEffect(() => {
    if (!appActive) {
      backgroundTapId.current = id;
      return;
    }
    if (!id || backgroundTapId.current === id) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (rage || count >= 3) {
      setTapPhase({ id, count, rage, stage: "single" });
      timers.push(setTimeout(() => setTapPhase(null), rage ? 1500 : 1200));
    } else {
      setTapPhase({ id, count, rage, stage: "start" });
      timers.push(setTimeout(() => setTapPhase({ id, count, rage, stage: "end" }), 300));
      timers.push(setTimeout(() => setTapPhase(null), 1200));
    }
    return () => timers.forEach(clearTimeout);
  }, [appActive, id, count, rage]);

  const source = resolveNavbarMascotSource({
    popup: appActive ? popup : null,
    quote: appActive ? quote : null,
    tap: appActive && tapPhase?.id === id ? tapPhase : null,
  });
  const sourceKey = source?.key;
  const pool = source?.pool;
  const popupId = popup?.id;
  const quoteEventId = quote?.eventId;

  useLayoutEffect(() => {
    // Keep only the current events, including sources temporarily covered by a popup.
    const retained = new Set([
      `popup-${popupId}`, `quote-${quoteEventId}`,
      `tap-${id}-start`, `tap-${id}-end`, `tap-${id}-single`,
    ]);
    for (const key of cache.current.keys()) {
      if (!retained.has(key)) cache.current.delete(key);
    }
    if (!sourceKey || !pool) {
      setPicked((current) => current === null ? current : null);
      return;
    }
    let variant = cache.current.get(sourceKey);
    if (!variant) {
      variant = pickWeightedNavbarReaction(pool, pool.length === 1 ? 0 : Math.random());
      // Store before updating state so repeated effects cannot draw twice.
      cache.current.set(sourceKey, variant);
    }
    const nextVariant = variant;
    setPicked((current) => current?.key === sourceKey && current.variant === nextVariant
      ? current : { key: sourceKey, variant: nextVariant });
  }, [sourceKey, pool, popupId, quoteEventId, id]);

  const isIdle = sourceKey == null;
  const variant = picked && picked.key === sourceKey ? picked.variant : IDLE_VARIANT;

  useLayoutEffect(() => {
    setBlinking(false);
    if (!appActive || reduceMotion || !isIdle) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setBlinking(true);
        timer = setTimeout(() => {
          setBlinking(false);
          schedule();
        }, 140);
      }, 4000 + Math.random() * 4000);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [appActive, reduceMotion, isIdle, id, sourceKey]);

  const faceParts: Partial<BoxFaceParts> | undefined = isIdle && blinking && appActive && !reduceMotion
    ? { ...variant.faceParts, eyes: "blink" } : variant.faceParts;
  return {
    ...variant,
    faceParts,
    reactionId: sourceKey ? `${sourceKey}-${variant.id}` : "idle",
    isIdle,
    appActive,
  };
}
