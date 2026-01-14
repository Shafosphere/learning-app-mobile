export interface WordWithTranslations {
  id: number;
  text: string;
  translations: string[];
  flipped: boolean;
  answerOnly?: boolean;
  hintFront?: string | null;
  hintBack?: string | null;
  imageFront?: string | null;
  imageBack?: string | null;
  type?: "text" | "image" | "true_false";
}

export interface BoxesState {
  boxZero: WordWithTranslations[];
  boxOne: WordWithTranslations[];
  boxTwo: WordWithTranslations[];
  boxThree: WordWithTranslations[];
  boxFour: WordWithTranslations[];
  boxFive: WordWithTranslations[];
}
