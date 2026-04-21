type Listener = () => void;

const listeners = new Set<Listener>();
let pendingPreview = false;

export function subscribeActionsPositionNudgePreview(
  listener: Listener
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function triggerActionsPositionNudgePreview(): void {
  pendingPreview = true;

  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.warn("[actionsPositionNudgePreview] listener failed", error);
    }
  });
}

export function consumeActionsPositionNudgePreview(): boolean {
  if (!pendingPreview) {
    return false;
  }

  pendingPreview = false;
  return true;
}
