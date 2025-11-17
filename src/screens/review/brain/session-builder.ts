import {
  buildChooseOneRoundForTarget,
  buildGetAPairRound,
  buildInputALetterRound,
  buildWrongLetterRound,
  shuffleArray,
  type SanitizedWord,
} from "./minigame-generators";
import {
  MINIGAME_REQUIREMENTS,
  type MinigameRequirement,
} from "./minigame-config";
import type {
  SessionTemplate,
  SessionWordSeed,
  SessionStepTemplate,
  SessionWordContext,
} from "@/src/screens/review/minigames/sessionStore";

export const MIN_SESSION_WORDS = 9;
const MAX_SESSION_WORDS = 20;
const MIN_MINIGAMES_PER_SESSION = 3;
const MAX_SELECTION_ATTEMPTS = 5;

export type SessionBuildResult =
  | { ok: true; template: SessionTemplate }
  | { ok: false; message: string };

type MinigameStepType = SessionWordSeed["source"];
type PlayableRequirement = MinigameRequirement & { isSummary?: false };

type WordContextMap = Record<number, SessionWordContext | undefined>;

type StepBuildContext = {
  sessionWords: SanitizedWord[];
  levelTranslations: string[];
  wordContexts: WordContextMap;
};

type StepBuildOutcome = {
  step: SessionStepTemplate;
  usedWords: SanitizedWord[];
  wordSeeds: SessionWordSeed[];
};

const toSeeds = (
  words: SanitizedWord[],
  source: SessionWordSeed["source"],
  contextMap: WordContextMap
): SessionWordSeed[] =>
  words.map((word) => ({
    wordId: word.id,
    term: word.term,
    translations: word.translations,
    source,
    context: contextMap[word.id] ?? null,
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

type BuildSessionParams = {
  sanitizedWords: SanitizedWord[];
  levelTranslations: string[];
  wordContexts: WordContextMap;
};

export const buildSessionTemplate = ({
  sanitizedWords,
  levelTranslations,
  wordContexts,
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
      message: `Potrzebujemy co najmniej ${MIN_SESSION_WORDS} słówek, aby rozpocząć sesję gier.`,
    };
  }

  const sessionWords = shuffleArray(sanitized).slice(
    0,
    Math.min(sanitized.length, MAX_SESSION_WORDS)
  );

  const dynamicTemplate = buildDynamicSessionTemplate({
    sessionWords,
    levelTranslations,
    wordContexts,
  });

  if (!dynamicTemplate) {
    console.warn("[Brain] Session build failed: unable to construct sequence", {
      sanitizedCount: sanitized.length,
      sessionWordCount: sessionWords.length,
    });
    return {
      ok: false,
      message:
        "Nie udało się przygotować sesji gier. Odśwież fiszki i spróbuj ponownie.",
    };
  }

  return {
    ok: true,
    template: dynamicTemplate,
  };
};

const isPlayableRequirement = (
  requirement: MinigameRequirement
): requirement is PlayableRequirement => requirement.isSummary !== true;

const PLAYABLE_REQUIREMENTS = MINIGAME_REQUIREMENTS.filter(isPlayableRequirement);

const getRequiredWordCount = (requirement: MinigameRequirement): number =>
  requirement.selectCount ?? requirement.minDistinctWords;

const violatesSequenceRules = (
  previousTypes: MinigameStepType[],
  nextType: MinigameStepType
): boolean => {
  const lastType = previousTypes[previousTypes.length - 1];
  if (lastType && lastType === nextType) {
    return true;
  }

  if (previousTypes.length < 3) {
    return false;
  }

  const prevType = previousTypes[previousTypes.length - 2];
  const thirdLast = previousTypes[previousTypes.length - 3];

  return Boolean(thirdLast && thirdLast === lastType && prevType === nextType);
};

const buildDynamicSessionTemplate = ({
  sessionWords,
  levelTranslations,
  wordContexts,
}: {
  sessionWords: SanitizedWord[];
  levelTranslations: string[];
  wordContexts: WordContextMap;
}): SessionTemplate | null => {
  let remainingWords = [...sessionWords];
  const context: StepBuildContext = {
    sessionWords,
    levelTranslations,
    wordContexts,
  };

  const steps: SessionStepTemplate[] = [];
  const wordSeeds: SessionWordSeed[] = [];
  const chosenTypes: MinigameStepType[] = [];

  while (remainingWords.length > 0) {
    const shuffledRequirements = shuffleArray(PLAYABLE_REQUIREMENTS);
    let outcome: StepBuildOutcome | null = null;

    for (const requirement of shuffledRequirements) {
      const stepType = requirement.type as MinigameStepType;
      if (violatesSequenceRules(chosenTypes, stepType)) {
        continue;
      }

      const requiredCount = getRequiredWordCount(requirement);
      const eligible = requirement.eligibleWords(remainingWords);

      if (eligible.length < requiredCount || requiredCount <= 0) {
        continue;
      }

      for (let attempt = 0; attempt < MAX_SELECTION_ATTEMPTS; attempt += 1) {
        const selected = shuffleArray(eligible).slice(0, requiredCount);

        if (selected.length < requiredCount) {
          continue;
        }

        const built = buildStepForRequirement(
          requirement,
          selected,
          context
        );

        if (built) {
          outcome = built;
          break;
        }
      }

      if (outcome) {
        break;
      }
    }

    if (!outcome) {
      console.warn("[Brain] Unable to select next minigame", {
        remainingWords: remainingWords.length,
        chosenTypes,
      });
      return null;
    }

    steps.push(outcome.step);
    wordSeeds.push(...outcome.wordSeeds);
    chosenTypes.push(outcome.step.type as MinigameStepType);

    const usedIds = new Set(outcome.usedWords.map((word) => word.id));
    remainingWords = remainingWords.filter((word) => !usedIds.has(word.id));
  }

  if (steps.length < MIN_MINIGAMES_PER_SESSION) {
    console.warn("[Brain] Too few minigames generated", {
      steps: steps.map((step) => step.type),
    });
    return null;
  }

  steps.push({ type: "table" });

  return {
    steps,
    words: wordSeeds,
  };
};

const buildStepForRequirement = (
  requirement: PlayableRequirement,
  selectedWords: SanitizedWord[],
  context: StepBuildContext
): StepBuildOutcome | null => {
  const source = requirement.type as MinigameStepType;
  switch (requirement.type) {
    case "memory": {
      return {
        step: {
          type: "memory",
          wordIds: selectedWords.map((word) => word.id),
          words: selectedWords,
        },
        usedWords: selectedWords,
        wordSeeds: toSeeds(selectedWords, source, context.wordContexts),
      };
    }
    case "chooseone": {
      const target = selectedWords[0];
      if (!target) {
        return null;
      }

      const round = buildChooseOneRoundForTarget(target, context.sessionWords);
      if (!round) {
        return null;
      }

      return {
        step: {
          type: "chooseone",
          wordId: target.id,
          round,
        },
        usedWords: selectedWords,
        wordSeeds: toSeeds(selectedWords, source, context.wordContexts),
      };
    }
    case "inputaletter": {
      const round = buildInputALetterRound(selectedWords);
      if (!round) {
        return null;
      }

      return {
        step: {
          type: "inputaletter",
          wordIds: selectedWords.map((word) => word.id),
          round,
        },
        usedWords: selectedWords,
        wordSeeds: toSeeds(selectedWords, source, context.wordContexts),
      };
    }
    case "getapair": {
      const round = buildGetAPairRound(
        selectedWords,
        context.sessionWords,
        context.levelTranslations
      );
      if (!round) {
        return null;
      }

      return {
        step: {
          type: "getapair",
          wordIds: selectedWords.map((word) => word.id),
          round,
        },
        usedWords: selectedWords,
        wordSeeds: toSeeds(selectedWords, source, context.wordContexts),
      };
    }
    case "wrongletter": {
      const target = selectedWords[0];
      if (!target) {
        return null;
      }

      const round = buildWrongLetterRound(target);
      if (!round) {
        return null;
      }

      return {
        step: {
          type: "wrongletter",
          wordId: target.id,
          round,
        },
        usedWords: selectedWords,
        wordSeeds: toSeeds(selectedWords, source, context.wordContexts),
      };
    }
    default:
      return null;
  }
};
