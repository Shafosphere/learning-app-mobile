import { useSettings } from "../contexts/SettingsContext";
import { stripDiacritics } from "../utils/diacritics";
export default function useSpellchecking() {
  const { spellChecking, ignoreDiacriticsInSpellcheck } = useSettings();

  function prepareWord(rawValue: string): string {
    const cleaned = rawValue.trim().toLowerCase();
    if (!ignoreDiacriticsInSpellcheck) {
      return cleaned;
    }
    return stripDiacritics(cleaned);
  }

  function levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  function checkSpelling(userForm: string, correctForm: string): boolean {
    if (!userForm || !correctForm) return false;

    const userWord = prepareWord(userForm);
    const correctWord = prepareWord(correctForm);

    if (spellChecking) {
      if (userWord === correctWord) return true;
      if (Math.min(userWord.length, correctWord.length) <= 1) {
        return false;
      }
      return levenshtein(userWord, correctWord) <= 1;
    }

    return userWord === correctWord;
  }

  return checkSpelling;
}
