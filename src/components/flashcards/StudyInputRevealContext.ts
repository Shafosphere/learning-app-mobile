import { createContext, useCallback, useContext, useRef } from "react";
import type { View } from "react-native";

type StudyInputReveal = {
  focus: (region: View) => void;
  blur: (region: View) => void;
  refresh: (region: View) => void;
};

export const StudyInputRevealContext = createContext<StudyInputReveal | null>(null);

/** Measure an input together with the actions the user needs to finish editing. */
export function useStudyInputReveal() {
  const controller = useContext(StudyInputRevealContext);
  const ref = useRef<View>(null);
  const setRef = useCallback((region: View | null) => {
    if (ref.current && ref.current !== region) controller?.blur(ref.current);
    ref.current = region;
  }, [controller]);
  const onFocus = useCallback(() => {
    if (ref.current) controller?.focus(ref.current);
  }, [controller]);
  const onBlur = useCallback(() => {
    if (ref.current) controller?.blur(ref.current);
  }, [controller]);
  const onLayout = useCallback(() => {
    if (ref.current) controller?.refresh(ref.current);
  }, [controller]);
  return { ref: setRef, onFocus, onBlur, onLayout };
}
