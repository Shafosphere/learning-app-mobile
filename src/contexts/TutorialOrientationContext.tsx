import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Keyboard, Platform, useWindowDimensions } from "react-native";
import { useDeviceLayout } from "@/src/hooks/useDeviceLayout";

type TutorialOrientation = {
  portraitRequired: boolean;
  layoutReady: boolean;
  ready: boolean;
  showNotice: boolean;
  acknowledge: () => void;
  acquire: () => () => void;
};

const TutorialOrientationContext = createContext<TutorialOrientation | null>(null);

export function TutorialOrientationProvider({ children }: React.PropsWithChildren) {
  const [requests, setRequests] = useState<Set<symbol>>(() => new Set());
  const [showNotice, setShowNotice] = useState(false);
  const [settledLayout, setSettledLayout] = useState<string | null>(null);
  const screen = useDeviceLayout({ sizeSource: "screen" });
  const window = useWindowDimensions();
  const portraitRequired = requests.size > 0;
  // Keyboard resizing must not be mistaken for a physical rotation.
  const portrait = Platform.OS === "web" ||
    (screen.orientation === "portrait" && Math.abs(window.width - screen.width) < 2);
  const layoutKey = `${screen.width}:${screen.height}:${window.width}`;

  const acquire = useCallback(() => {
    const token = Symbol("tutorial-orientation");
    setRequests(previous => new Set(previous).add(token));
    return () => setRequests(previous => {
      const next = new Set(previous);
      next.delete(token);
      return next;
    });
  }, []);
  const acknowledge = useCallback(() => setShowNotice(false), []);

  useEffect(() => {
    if (!portraitRequired) {
      setShowNotice(false);
      return;
    }
    Keyboard.dismiss();
  }, [portraitRequired]);

  useEffect(() => {
    if (Platform.OS !== "web" && portraitRequired && screen.orientation === "landscape") {
      setShowNotice(true);
      Keyboard.dismiss();
    }
  }, [portraitRequired, screen.orientation]);

  useEffect(() => {
    setSettledLayout(null);
    if (!portraitRequired || !portrait) return;
    // Wait for native rotation, navigation and target layouts before measuring
    // coachmarks. Returning to landscape cancels this timer immediately.
    const timer = setTimeout(() => setSettledLayout(layoutKey), 400);
    return () => clearTimeout(timer);
  }, [portraitRequired, portrait, layoutKey]);

  const layoutReady = portrait && settledLayout === layoutKey;
  const value = useMemo(() => ({
    portraitRequired,
    layoutReady,
    showNotice,
    ready: !portraitRequired || (layoutReady && !showNotice),
    acquire,
    acknowledge,
  }), [portraitRequired, layoutReady, showNotice, acquire, acknowledge]);

  return <TutorialOrientationContext.Provider value={value}>{children}</TutorialOrientationContext.Provider>;
}

export const useTutorialOrientationState = () => useContext(TutorialOrientationContext);

export function useTutorialPortrait(required: boolean) {
  const context = useTutorialOrientationState();
  const acquire = context?.acquire;
  const [acquired, setAcquired] = useState(false);
  useEffect(() => {
    if (!required || !acquire) {
      setAcquired(false);
      return;
    }
    const release = acquire();
    setAcquired(true);
    return release;
  }, [required, acquire]);
  return !required || !context || (acquired && context.portraitRequired && context.ready);
}
