type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeLocalExportReminderPreview(
  listener: Listener
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function triggerLocalExportReminderPreview(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.warn("[localExportReminderPreview] listener failed", error);
    }
  });
}
