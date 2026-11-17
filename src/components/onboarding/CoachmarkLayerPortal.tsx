import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { GuidedCoachmarkLayer, type GuidedCoachmarkLayerProps } from "./GuidedCoachmarkLayer";
import { TutorialOrientationGate } from "./TutorialOrientationGate";
import { useTutorialOrientationState } from "@/src/contexts/TutorialOrientationContext";

type CoachmarkLayerRegistration = GuidedCoachmarkLayerProps & {
  ownerId: string;
};

type CoachmarkLayerPortalContextValue = {
  setLayer: (ownerId: string, layer: GuidedCoachmarkLayerProps | null) => void;
};

const CoachmarkLayerPortalContext = createContext<CoachmarkLayerPortalContextValue | null>(
  null,
);

export function CoachmarkLayerPortalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [layer, setLayerState] = useState<CoachmarkLayerRegistration | null>(null);
  const orientation = useTutorialOrientationState();

  const value = useMemo<CoachmarkLayerPortalContextValue>(
    () => ({
      setLayer: (ownerId, nextLayer) => {
        setLayerState((current) => {
          if (nextLayer == null) {
            return current?.ownerId === ownerId ? null : current;
          }

          return {
            ownerId,
            ...nextLayer,
          };
        });
      },
    }),
    [],
  );

  return (
    <CoachmarkLayerPortalContext.Provider value={value}>
      {children}
      {layer && orientation?.ready !== false ? <GuidedCoachmarkLayer {...layer} /> : null}
      <TutorialOrientationGate />
    </CoachmarkLayerPortalContext.Provider>
  );
}

export function useCoachmarkLayerPortal(
  ownerId: string,
  layer: GuidedCoachmarkLayerProps | null,
) {
  const context = useContext(CoachmarkLayerPortalContext);

  if (!context) {
    throw new Error("useCoachmarkLayerPortal must be used within CoachmarkLayerPortalProvider");
  }

  useEffect(() => {
    context.setLayer(ownerId, layer);

    return () => {
      context.setLayer(ownerId, null);
    };
  }, [context, layer, ownerId]);
}
