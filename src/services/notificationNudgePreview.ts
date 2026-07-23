type Listener = () => void;

const listeners = new Set<Listener>();
let pendingPreview = false;

export function subscribeNotificationNudgePreview(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function triggerNotificationNudgePreview(): void {
  pendingPreview = true;
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.warn("[notificationNudgePreview] listener failed", error);
    }
  });
}

export function consumeNotificationNudgePreview(): boolean {
  if (!pendingPreview) return false;
  pendingPreview = false;
  return true;
}
