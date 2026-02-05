export interface WordWithTranslations {
  id: number;
  text: string;
  translations: string[];
  flipped: boolean;
  answerOnly?: boolean;
  stage?: number;
  nextReview?: number;
  hintFront?: string | null;
  hintBack?: string | null;
  imageFront?: string | null;
  imageBack?: string | null;
  explanation?: string | null;
  type?: "text" | "image" | "true_false" | "know_dont_know";
}

export interface BoxesState {
  boxZero: WordWithTranslations[];
  boxOne: WordWithTranslations[];
  boxTwo: WordWithTranslations[];
  boxThree: WordWithTranslations[];
  boxFour: WordWithTranslations[];
  boxFive: WordWithTranslations[];
}
