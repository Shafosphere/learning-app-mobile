import { createContext } from "react";

export type CardPreviewImage = {
  uri: string;
  isSvg: boolean;
  svgXml: string | null;
  ratio: number;
};

// Only images rendered inside a Card participate in its preview lifecycle.
export const CardImagePreviewContext = createContext<
  ((image: CardPreviewImage) => void) | null
>(null);
