import {
  buildChooseOneRoundForTarget,
  buildGetAPairRound,
  buildInputALetterRound,
  getLetterIndices,
  shuffleArray,
  type SanitizedWord,
} from "./minigame-generators";
import type {
  SessionTemplate,
  SessionWordSeed,
  SessionStepTemplate,
} from "@/src/screens/review/minigames/sessionStore";

export const MIN_SESSION_WORDS = 10;

export type SessionBuildResult =
  | { ok: true; template: SessionTemplate }
  | { ok: false; message: string };

const differenceById = (
  source: SanitizedWord[],
  ids: Set<number>
): SanitizedWord[] => source.filter((word) => !ids.has(word.id));

const toSeeds = (
  words: SanitizedWord[],
  source: SessionWordSeed["source"]
): SessionWordSeed[] =>
  words.map((word) => ({
    wordId: word.id,
    term: word.term,
    translations: word.translations,
    source,
  }));

const uniqueById = (words: SanitizedWord[]): SanitizedWord[] => {
  const seen = new Set<number>();
  return words.filter((word) => {
    if (seen.has(word.id)) {
      return false;
    }
    seen.add(word.id);
    return true;
  });
};

const combinationIterator = (
  items: SanitizedWord[],
  size: number,
  visitor: (combo: SanitizedWord[]) => boolean
): boolean => {
  const n = items.length;
  if (size === 0 || size > n) {
    return false;
  }

  const indices = Array.from({ length: size }, (_, index) => index);

  const visit = () => {
    const combo = indices.map((index) => items[index]);
    return visitor(combo);
  };

  if (visit()) {
    return true;
  }

  while (true) {
    let i = size - 1;
    while (i >= 0 && indices[i] === i + n - size) {
      i -= 1;
    }

    if (i < 0) {
      break;
    }

    indices[i] += 1;
    for (let j = i + 1; j < size; j += 1) {
      indices[j] = indices[j - 1] + 1;
    }

    if (visit()) {
      return true;
    }
  }

  return false;
};

type BuildSessionParams = {
  sanitizedWords: SanitizedWord[];
  levelTranslations: string[];
};

export const buildSessionTemplate = ({
  sanitizedWords,
  levelTranslations,
}: BuildSessionParams): SessionBuildResult => {
  const sanitized = uniqueById(sanitizedWords);
  console.log("[Brain] Starting session build", {
    received: sanitizedWords.length,
    unique: sanitized.length,
  });

  if (sanitized.length < MIN_SESSION_WORDS) {
    console.warn("[Brain] Session build aborted: insufficient words", {
      required: MIN_SESSION_WORDS,
      available: sanitized.length,
    });
    return {
      ok: false,
      message: "Potrzebujemy co najmniej 10 słówek, aby rozpocząć sesję gier.",
    };
  }

  const inputEligible = sanitized.filter(
    (word) => getLetterIndices(word.term).length > 0
  );

  if (inputEligible.length < 3) {
    console.warn("[Brain] Session build aborted: not enough input-eligible words", {
      inputEligibleCount: inputEligible.length,
      total: sanitized.length,
    });
    return {
      ok: false,
      message:
        "Brakuje słówek, w których możemy ukryć litery. Odśwież fiszki i spróbuj ponownie.",
    };
  }

  const shuffledInputCandidates = shuffleArray(inputEligible);
  const allWordsShuffled = shuffleArray(sanitized);

  let template: SessionTemplate | null = null;

  combinationIterator(shuffledInputCandidates, 3, (inputCombo) => {
    const inputIds = new Set(inputCombo.map((word) => word.id));
    const remainingAfterInput = differenceById(allWordsShuffled, inputIds);

    if (remainingAfterInput.length < 7) {
      return false;
    }

    const shuffledPairsPool = shuffleArray(remainingAfterInput);

    const foundPair = combinationIterator(shuffledPairsPool, 3, (pairCombo) => {
      const pairRound = buildGetAPairRound(pairCombo, sanitized, levelTranslations);
      if (!pairRound) {
        return false;
      }

      const pairIds = new Set(pairCombo.map((word) => word.id));
      const remainingAfterPairs = differenceById(remainingAfterInput, pairIds);

      if (remainingAfterPairs.length < 4) {
        return false;
      }

      const shuffledChooseCandidates = shuffleArray(remainingAfterPairs);

      for (const chooseCandidate of shuffledChooseCandidates) {
        const chooseRound = buildChooseOneRoundForTarget(
          chooseCandidate,
          sanitized
        );

        if (!chooseRound) {
          continue;
        }

        const remainingAfterChoose = remainingAfterPairs.filter(
          (word) => word.id !== chooseCandidate.id
        );

        if (remainingAfterChoose.length < 3) {
          continue;
        }

        const memoryWords = shuffleArray(remainingAfterChoose).slice(0, 3);

        if (memoryWords.length < 3) {
          continue;
        }

        const inputRound = buildInputALetterRound(inputCombo);

        if (!inputRound) {
          console.warn("[Brain] Failed to build Input a letter round", {
            inputWordIds: inputCombo.map((word) => word.id),
            inputTerms: inputCombo.map((word) => word.term),
          });
          continue;
        }

        // Prepare session data
        const steps: SessionStepTemplate[] = [
          {
            type: "memory",
            wordIds: memoryWords.map((word) => word.id),
            words: memoryWords,
          },
          {
            type: "chooseone",
            wordId: chooseCandidate.id,
            round: chooseRound,
          },
          {
            type: "inputaletter",
            wordIds: inputCombo.map((word) => word.id),
            round: inputRound,
          },
          {
            type: "getapair",
            wordIds: pairCombo.map((word) => word.id),
            round: pairRound,
          },
          {
            type: "table",
          },
        ];

        const wordSeeds: SessionWordSeed[] = [
          ...toSeeds(memoryWords, "memory"),
          ...toSeeds([chooseCandidate], "chooseone"),
          ...toSeeds(inputCombo, "inputaletter"),
          ...toSeeds(pairCombo, "getapair"),
        ];

        template = {
          steps,
          words: wordSeeds,
        };

        console.log("[Brain] Session template built", {
          memoryWordIds: memoryWords.map((word) => word.id),
          chooseWordId: chooseCandidate.id,
          inputWordIds: inputCombo.map((word) => word.id),
          getAPairWordIds: pairCombo.map((word) => word.id),
          levelTranslationsCount: levelTranslations.length,
        });

        return true;
      }

      return false;
    });

    return foundPair;
  });

  if (!template) {
    console.warn("[Brain] Session build failed after all combinations tried", {
      sanitizedCount: sanitized.length,
      inputEligibleCount: inputEligible.length,
    });
    return {
      ok: false,
      message:
        "Nie udało się przygotować sesji gier. Odśwież fiszki i spróbuj ponownie.",
    };
  }

  return {
    ok: true,
    template,
  };
};
