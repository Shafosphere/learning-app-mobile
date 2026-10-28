import { createContext, useContext } from "react";

export function getLandscapeStudyLayout(width: number, visibleHeight: number, isTyping = false) {
  const cardWidth = Math.max(0, Math.min(isTyping ? 960 : 780, width - (isTyping ? 48 : 64)));
  const height = Math.max(144, Math.min(200, visibleHeight - 32));
  const promptWidth = Math.max(0, (cardWidth - 52) * 0.46);
  return { cardWidth, height, promptWidth, imageHeight: height - 32 };
}

export const LandscapeStudyContext = createContext<ReturnType<typeof getLandscapeStudyLayout> | null>(null);
export const useLandscapeStudyLayout = () => useContext(LandscapeStudyContext);
