import type { WordWithTranslations } from "@/src/types/boxes";

// --- Types -----------------------------------------------------------------

export type SanitizedWord = {
  id: number;
  term: string;
  translations: string[];
};

export type ChooseOneRound = {
  prompt: string;
  options: string[];
  correctIndex: number;
};

export type GetAPairPair = {
  id: number;
  term: string;
  translation: string;
  isCorrect: boolean;
};

export type GetAPairRound = {
  pairs: GetAPairPair[];
};

export type InputALetterWord = {
  id: number;
  term: string;
  missingIndices: number[];
};

export type InputALetterRound = {
  words: InputALetterWord[];
  letters: string[];
};

export type WrongLetterTile = {
  char: string;
  isWrong: boolean;
};

export type WrongLetterRound = {
  originalWord: string;
  letters: WrongLetterTile[];
  wrongIndex: number;
};

// --- Helpers ----------------------------------------------------------------

export const sanitizeWord = (
  word: WordWithTranslations
): SanitizedWord | null => {
  const term = word.text?.trim() ?? "";
  const translations = word.translations
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (!term || translations.length === 0) {
    return null;
  }

  return {
    id: word.id,
    term,
    translations,
  };
};

export const shuffleArray = <T,>(
  items: T[],
  rng: () => number = Math.random
): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const isAlphabeticCharacter = (value: string): boolean => {
  if (value.length === 0) {
    return false;
  }

  const lower = value.toLocaleLowerCase();
  const upper = value.toLocaleUpperCase();

  return lower !== upper;
};

export const getLetterIndices = (term: string): number[] => {
  const characters = Array.from(term);

  return characters
    .map((char, index) => (isAlphabeticCharacter(char) ? index : -1))
    .filter((index) => index !== -1);
};

const WRONG_LETTER_POOL = Array.from("abcdefghijklmnopqrstuvwxyz");

const pickWrongLetter = (term: string, rng: () => number): string => {
  const lowerSet = new Set(Array.from(term.toLocaleLowerCase()));
  const available = WRONG_LETTER_POOL.filter((letter) => !lowerSet.has(letter));
  const pool = available.length > 0 ? available : WRONG_LETTER_POOL;
  const randomIndex = Math.floor(rng() * pool.length);
  return pool[randomIndex] ?? "x";
};

export const buildWrongLetterRoundFromTerm = (
  term: string,
  rng: () => number = Math.random
): WrongLetterRound | null => {
  const normalized = term.trim();

  if (normalized.length < 2) {
    return null;
  }

  const characters = Array.from(normalized);
  const insertIndex = Math.floor(rng() * (characters.length - 1)) + 1;
  const wrongLetter = pickWrongLetter(normalized, rng);

  const letters = [
    ...characters.slice(0, insertIndex),
    wrongLetter,
    ...characters.slice(insertIndex),
  ];

  return {
    originalWord: normalized,
    wrongIndex: insertIndex,
    letters: letters.map((char, index) => ({
      char,
      isWrong: index === insertIndex,
    })),
  };
};

export const buildWrongLetterRound = (
  word: SanitizedWord,
  rng: () => number = Math.random
): WrongLetterRound | null => buildWrongLetterRoundFromTerm(word.term, rng);

// --- Choose One -------------------------------------------------------------

const pickRandom = (count: number, rng: () => number) =>
  Math.floor(rng() * count);

export const buildChooseOneRoundForTarget = (
  target: SanitizedWord,
  pool: SanitizedWord[],
  rng: () => number = Math.random
): ChooseOneRound | null => {
  if (!target || target.translations.length === 0) {
    return null;
  }

  const correctTranslation =
    target.translations[pickRandom(target.translations.length, rng)];

  const otherTranslations = pool
    .filter((entry) => entry.id !== target.id)
    .flatMap((entry) => entry.translations)
    .filter((value) => value !== correctTranslation);

  const uniqueDistractors = shuffleArray(
    Array.from(new Set(otherTranslations)),
    rng
  );

  if (uniqueDistractors.length < 2) {
    return null;
  }

  const distractors = uniqueDistractors.slice(0, 2);
  const options = shuffleArray([...distractors, correctTranslation], rng);
  const correctIndex = options.indexOf(correctTranslation);

  if (correctIndex === -1) {
    return null;
  }

  return {
    prompt: target.term,
    options,
    correctIndex,
  };
};

export const createChooseOneRound = (
  words: SanitizedWord[],
  rng: () => number = Math.random
): ChooseOneRound | null => {
  if (words.length < 3) {
    return null;
  }

  const targetIndex = pickRandom(words.length, rng);
  const target = words[targetIndex];

  if (!target) {
    return null;
  }

  return buildChooseOneRoundForTarget(target, words, rng);
};

// --- Get a Pair -------------------------------------------------------------

const normalize = (value: string) => value.trim();

const getUniqueTranslations = (values: string[]): string[] =>
  Array.from(new Set(values.map(normalize).filter((entry) => entry.length > 0)));

const buildSubsets = <T,>(items: T[], size: number): T[][] => {
  if (size === 0) {
    return [[]];
  }
  if (size > items.length) {
    return [];
  }

  const result: T[][] = [];

  const helper = (start: number, path: T[]) => {
    if (path.length === size) {
      result.push([...path]);
      return;
    }

    for (let i = start; i < items.length; i += 1) {
      path.push(items[i]);
      helper(i + 1, path);
      path.pop();
    }
  };

  helper(0, []);
  return result;
};

const assignUniqueCorrectTranslations = (
  selectedWords: SanitizedWord[],
  rng: () => number
): Map<number, string> | null => {
  const attempts = 10;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const order = shuffleArray([...selectedWords], rng);
    const used = new Set<string>();
    const assignments = new Map<number, string>();

    const backtrack = (index: number): boolean => {
      if (index >= order.length) {
        return true;
      }

      const word = order[index];
      const options = shuffleArray(
        getUniqueTranslations(word.translations),
        rng
      );

      for (const option of options) {
        if (used.has(option)) {
          continue;
        }

        used.add(option);
        assignments.set(word.id, option);

        if (backtrack(index + 1)) {
          return true;
        }

        used.delete(option);
        assignments.delete(word.id);
      }

      return false;
    };

    if (backtrack(0)) {
      return assignments;
    }
  }

  return null;
};

const getWrongCandidates = (
  word: SanitizedWord,
  allWords: SanitizedWord[],
  levelTranslations: string[]
): string[] => {
  const ownTranslations = new Set(getUniqueTranslations(word.translations));

  const otherTranslations = allWords
    .filter((entry) => entry.id !== word.id)
    .flatMap((entry) => entry.translations);

  const combined = [...otherTranslations, ...levelTranslations];

  return getUniqueTranslations(combined).filter(
    (translation) => !ownTranslations.has(translation)
  );
};

export const buildGetAPairRound = (
  selectedWords: SanitizedWord[],
  allWords: SanitizedWord[],
  levelTranslations: string[],
  rng: () => number = Math.random
): GetAPairRound | null => {
  if (selectedWords.length < 3) {
    return null;
  }

  const assignments = assignUniqueCorrectTranslations(selectedWords, rng);

  if (!assignments || assignments.size !== selectedWords.length) {
    return null;
  }

  const candidatesForIncorrect = selectedWords.filter(
    (word) => getWrongCandidates(word, allWords, levelTranslations).length > 0
  );

  const possibleCounts =
    candidatesForIncorrect.length === 0
      ? [0]
      : Array.from(
          { length: candidatesForIncorrect.length + 1 },
          (_, index) => index
        );

  const countsToTry = shuffleArray(possibleCounts, rng);

  for (const count of countsToTry) {
    const subsets = buildSubsets(candidatesForIncorrect, count);
    const subsetsToTry = shuffleArray(subsets, rng);

    for (const subset of subsetsToTry) {
      const incorrectIds = new Set(subset.map((word) => word.id));
      const pairs: GetAPairPair[] = [];
      const usedTranslations = new Set<string>();
      let failed = false;

      // Assign correct pairs first to reserve their translations
      for (const word of selectedWords) {
        if (incorrectIds.has(word.id)) {
          continue;
        }

        const translation = assignments.get(word.id);
        if (!translation || usedTranslations.has(translation)) {
          failed = true;
          break;
        }

        usedTranslations.add(translation);
        pairs.push({
          id: word.id,
          term: word.term,
          translation,
          isCorrect: true,
        });
      }

      if (failed) {
        continue;
      }

      for (const word of subset) {
        const wrongCandidates = shuffleArray(
          getWrongCandidates(word, allWords, levelTranslations).filter(
            (translation) => !usedTranslations.has(translation)
          ),
          rng
        );

        const chosenWrong = wrongCandidates[0];

        if (!chosenWrong) {
          failed = true;
          break;
        }

        usedTranslations.add(chosenWrong);
        pairs.push({
          id: word.id,
          term: word.term,
          translation: chosenWrong,
          isCorrect: false,
        });
      }

      if (!failed && pairs.length === selectedWords.length) {
        return {
          pairs: shuffleArray(pairs, rng),
        };
      }
    }
  }

  return null;
};

export const createGetAPairRound = (
  words: SanitizedWord[],
  levelTranslations: string[],
  rng: () => number = Math.random
): GetAPairRound | null => {
  if (words.length < 3) {
    return null;
  }

  const selectedWords = shuffleArray(words, rng).slice(0, 3);

  if (selectedWords.length < 3) {
    return null;
  }

  return buildGetAPairRound(selectedWords, words, levelTranslations, rng);
};

// --- Input a Letter --------------------------------------------------------

export const buildInputALetterRound = (
  selectedWords: SanitizedWord[],
  rng: () => number = Math.random
): InputALetterRound | null => {
  if (selectedWords.length < 3) {
    console.warn("[Brain] Input a letter: insufficient selected words", {
      selectedCount: selectedWords.length,
    });
    return null;
  }

  const words: InputALetterWord[] = [];
  const lettersBag: string[] = [];
  let totalSlots = 0;

  selectedWords.forEach((word, index) => {
    const indices = getLetterIndices(word.term);

    if (indices.length === 0) {
      return;
    }

    const shuffled = shuffleArray(indices, rng);
    const missingIndices = shuffled
      .slice(0, Math.min(2, shuffled.length))
      .sort((a, b) => a - b);

    if (missingIndices.length === 0) {
      return;
    }

    totalSlots += missingIndices.length;

    words.push({
      id: word.id,
      term: word.term,
      missingIndices,
    });

    missingIndices.forEach((position) => {
      const char = Array.from(word.term)[position] ?? "";
      if (char) {
        lettersBag.push(char);
      }
    });
  });

  const letters = shuffleArray([...lettersBag], rng);

  if (words.length < 3 || letters.length === 0) {
    console.warn("[Brain] Input a letter round generation failed", {
      wordsCount: words.length,
      lettersCount: letters.length,
      selectedWordIds: selectedWords.map((word) => word.id),
    });
    return null;
  }

  if (letters.length < totalSlots) {
    console.warn("[Brain] Input a letter round has fewer letters than slots", {
      totalSlots,
      lettersCount: letters.length,
      letters,
      words: words.map((word) => ({
        id: word.id,
        term: word.term,
        missingIndices: word.missingIndices,
      })),
      selectedWordIds: selectedWords.map((word) => word.id),
    });
  }

  return {
    words,
    letters,
  };
};

export const createInputALetterRound = (
  words: SanitizedWord[],
  rng: () => number = Math.random
): InputALetterRound | null => {
  const eligible = words.filter(
    (word) => getLetterIndices(word.term).length > 0
  );

  if (eligible.length < 3) {
    return null;
  }

  const selectedWords = shuffleArray(eligible, rng).slice(0, 3);

  if (selectedWords.length < 3) {
    return null;
  }

  return buildInputALetterRound(selectedWords, rng);
};
