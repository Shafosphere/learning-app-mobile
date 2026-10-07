import { useLayoutEffect, useRef } from "react";
import type { CardProps } from "@/src/components/card/card-types";

/** Retain the last settled card while the engine finishes a transition. */
export function useStableFlashcardPresentation(
  nextCardProps: CardProps,
  holdContent: boolean,
  courseId: number | null,
) {
  const settledRef = useRef({ courseId, cardProps: nextCardProps });
  const isHeld = holdContent
    && settledRef.current.courseId === courseId
    && settledRef.current.cardProps.selectedItem != null;
  const cardProps = isHeld ? settledRef.current.cardProps : nextCardProps;

  useLayoutEffect(() => {
    if (!isHeld) {
      settledRef.current = { courseId, cardProps: nextCardProps };
    }
  }, [courseId, isHeld, nextCardProps]);

  return { cardProps, isHeld };
}
