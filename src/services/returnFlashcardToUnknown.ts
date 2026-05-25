import { removeCustomReview } from "@/src/db/sqlite/db";
import {
  makeScopeId,
  removePersistedFlashcardFromBoxes,
} from "@/src/hooks/useBoxesPersistenceSnapshot";
import { appendDebugEvent } from "@/src/services/debugEvents";

export type FlashcardReturnedToUnknownEvent = {
  courseId: number;
  flashcardId: number;
};

type Listener = (event: FlashcardReturnedToUnknownEvent) => void;

const listeners = new Set<Listener>();

function getCustomBoxesStorageKey(courseId: number): string {
  return `customBoxes:${makeScopeId(courseId, courseId, `custom-${courseId}`)}`;
}

export function subscribeFlashcardReturnedToUnknown(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function returnFlashcardToUnknown(
  event: FlashcardReturnedToUnknownEvent
): Promise<void> {
  const { courseId, flashcardId } = event;
  if (!courseId || !flashcardId) {
    throw new Error("Missing course or flashcard id for reset.");
  }

  await removeCustomReview(flashcardId, courseId);
  await removePersistedFlashcardFromBoxes(
    getCustomBoxesStorageKey(courseId),
    flashcardId,
    courseId
  );

  void appendDebugEvent("flashcards", "card.returnToUnknown", {
    courseId,
    cardId: flashcardId,
  });
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.warn("[returnFlashcardToUnknown] listener failed", error);
    }
  });
}
