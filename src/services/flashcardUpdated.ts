import type { WordWithTranslations } from "@/src/types/boxes";

export type FlashcardUpdatedEvent = {
  courseId: number;
  card: WordWithTranslations;
};

type Listener = (event: FlashcardUpdatedEvent) => void;

const listeners = new Set<Listener>();

export function subscribeFlashcardUpdated(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyFlashcardUpdated(event: FlashcardUpdatedEvent): void {
  listeners.forEach((listener) => listener(event));
}
