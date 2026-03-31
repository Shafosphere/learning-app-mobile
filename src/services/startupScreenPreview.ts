type StartupScreenPreviewPayload = {
  durationMs?: number;
  messageKey?: string;
};

type Listener = (payload: Required<StartupScreenPreviewPayload>) => void;

const listeners = new Set<Listener>();

const DEFAULT_PREVIEW: Required<StartupScreenPreviewPayload> = {
  durationMs: 2200,
  messageKey: "app.loading.initializing",
};

export function subscribeStartupScreenPreview(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function triggerStartupScreenPreview(
  payload?: StartupScreenPreviewPayload
): void {
  const nextPayload: Required<StartupScreenPreviewPayload> = {
    durationMs: payload?.durationMs ?? DEFAULT_PREVIEW.durationMs,
    messageKey: payload?.messageKey ?? DEFAULT_PREVIEW.messageKey,
  };

  listeners.forEach((listener) => {
    try {
      listener(nextPayload);
    } catch (error) {
      console.warn("[startupScreenPreview] listener failed", error);
    }
  });
}
