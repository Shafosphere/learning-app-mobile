type Listener = () => void;

const listeners = new Set<Listener>();
let pendingPreview = false;

export function subscribeCourseFinishedPreview(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function triggerCourseFinishedPreview(): void {
  pendingPreview = true;

  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.warn("[courseFinishedPreview] listener failed", error);
    }
  });
}

export function consumeCourseFinishedPreview(): boolean {
  if (!pendingPreview) {
    return false;
  }

  pendingPreview = false;
  return true;
}
