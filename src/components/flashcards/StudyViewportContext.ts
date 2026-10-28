import { createContext } from "react";

// Scroll content has unbounded height. Boxes need the actual study viewport
// instead, so their natural height cannot become their scaling budget.
// Preserve this scaling budget during keyboard entry. The scroll container
// separately tracks the visible height to reveal inputs without resizing boxes.
export const StudyViewportContext = createContext<number | null>(null);

// Cards in landscape fit the space above the keyboard, independently of the
// stable budget used to size the boxes.
export const VisibleStudyViewportContext = createContext<number | null>(null);
