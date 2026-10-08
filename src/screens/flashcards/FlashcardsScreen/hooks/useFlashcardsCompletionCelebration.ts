import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
type Params = {
  isCourseFinishedVisible: boolean;
  setShouldCelebrate: Dispatch<SetStateAction<boolean>>;
};

export function useFlashcardsCompletionCelebration({
  isCourseFinishedVisible,
  setShouldCelebrate,
}: Params) {
  const wasCourseFinishedVisibleRef = useRef(false);

  useEffect(() => {
    if (isCourseFinishedVisible && !wasCourseFinishedVisibleRef.current) {
      setShouldCelebrate(false);
      requestAnimationFrame(() => {
        setShouldCelebrate(true);
      });
    }

    wasCourseFinishedVisibleRef.current = isCourseFinishedVisible;
  }, [isCourseFinishedVisible, setShouldCelebrate]);

}
