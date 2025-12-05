export interface WordWithTranslations {
  id: number;
  text: string;
  translations: string[];
  flipped: boolean;
  hintFront?: string | null;
  hintBack?: string | null;
}

export interface BoxesState {
  boxZero: WordWithTranslations[];
  boxOne: WordWithTranslations[];
  boxTwo: WordWithTranslations[];
  boxThree: WordWithTranslations[];
  boxFour: WordWithTranslations[];
  boxFive: WordWithTranslations[];
}
