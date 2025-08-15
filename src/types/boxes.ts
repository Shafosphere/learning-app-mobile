export interface WordWithTranslations {
  id: number;
  text: string;
  translations: string[];
}

export interface BoxesState {
  boxOne: WordWithTranslations[];
  boxTwo: WordWithTranslations[];
  boxThree: WordWithTranslations[];
  boxFour: WordWithTranslations[];
  boxFive: WordWithTranslations[];
}