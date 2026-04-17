import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { GuidedCoachmarkLayer, type GuidedCoachmarkLayerProps } from "./GuidedCoachmarkLayer";

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
      {layer ? <GuidedCoachmarkLayer {...layer} /> : null}
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
