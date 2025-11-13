import type {
  ChooseOneRound,
  GetAPairRound,
  InputALetterRound,
  SanitizedWord,
  WrongLetterRound,
} from "@/src/screens/review/brain/minigame-generators";

export type SessionStepType =
  | "memory"
  | "chooseone"
  | "inputaletter"
  | "getapair"
  | "wrongletter"
  | "table";

export type SessionWordStatus = "pending" | "correct" | "incorrect";

export type SessionWordSeed = {
  wordId: number;
  term: string;
  translations: string[];
  source: Exclude<SessionStepType, "table">;
};

export type SessionWordResult = SessionWordSeed & {
  status: SessionWordStatus;
};

type MemoryStep = {
  type: "memory";
  wordIds: number[];
  words: SanitizedWord[];
};

type ChooseOneStep = {
  type: "chooseone";
  wordId: number;
  round: ChooseOneRound;
};

type InputALetterStep = {
  type: "inputaletter";
  wordIds: number[];
  round: InputALetterRound;
};

type GetAPairStep = {
  type: "getapair";
  wordIds: number[];
  round: GetAPairRound;
};

type WrongLetterStep = {
  type: "wrongletter";
  wordId: number;
  round: WrongLetterRound;
};

type TableStep = {
  type: "table";
};

export type SessionStepTemplate =
  | MemoryStep
  | ChooseOneStep
  | InputALetterStep
  | GetAPairStep
  | WrongLetterStep
  | TableStep;

export type SessionStep = SessionStepTemplate & { id: string };

type Session = {
  id: string;
  steps: SessionStep[];
  currentIndex: number;
  words: Record<number, SessionWordResult>;
  createdAt: number;
};

type SessionsState = Map<string, Session>;

const sessions: SessionsState = new Map();

const createIdFactory = (prefix: string) => {
  let counter = 0;
  return () => {
    counter += 1;
    return `${prefix}_${Date.now()}_${counter}`;
  };
};

const createSessionId = createIdFactory("session");
const createStepId = createIdFactory("step");

export type SessionTemplate = {
  steps: SessionStepTemplate[];
  words: SessionWordSeed[];
};

export type RegisteredSession = {
  sessionId: string;
  firstStep: SessionStep | null;
};

export const registerSession = (
  template: SessionTemplate
): RegisteredSession => {
  const sessionId = createSessionId();
  const steps: SessionStep[] = template.steps.map((step) => ({
    ...step,
    id: createStepId(),
  }));

  const wordsRecord: Record<number, SessionWordResult> = {};

  template.words.forEach((entry) => {
    wordsRecord[entry.wordId] = {
      ...entry,
      status: "pending",
    };
  });

  const session: Session = {
    id: sessionId,
    steps,
    currentIndex: 0,
    words: wordsRecord,
    createdAt: Date.now(),
  };

  sessions.set(sessionId, session);

  return {
    sessionId,
    firstStep: steps[0] ?? null,
  };
};

const getSessionInternal = (sessionId: string): Session | null =>
  sessions.get(sessionId) ?? null;

export const getSessionStep = (
  sessionId: string,
  stepId: string
): SessionStep | null => {
  const session = getSessionInternal(sessionId);
  if (!session) {
    return null;
  }

  return session.steps.find((step) => step.id === stepId) ?? null;
};

export const getCurrentStep = (sessionId: string): SessionStep | null => {
  const session = getSessionInternal(sessionId);
  if (!session) {
    return null;
  }

  return session.steps[session.currentIndex] ?? null;
};

export type StepCompletionUpdate = {
  wordId: number;
  status: Exclude<SessionWordStatus, "pending">;
};

export const completeSessionStep = (
  sessionId: string,
  stepId: string,
  updates: StepCompletionUpdate[] = []
): SessionStep | null => {
  const session = getSessionInternal(sessionId);
  if (!session) {
    return null;
  }

  const currentStep = session.steps[session.currentIndex];

  if (!currentStep || currentStep.id !== stepId) {
    return currentStep ?? null;
  }

  updates.forEach((update) => {
    const entry = session.words[update.wordId];
    if (!entry) {
      return;
    }
    entry.status = update.status;
  });

  session.currentIndex += 1;

  return session.steps[session.currentIndex] ?? null;
};

export const getSessionResults = (
  sessionId: string
): SessionWordResult[] | null => {
  const session = getSessionInternal(sessionId);
  if (!session) {
    return null;
  }
  return Object.values(session.words);
};

export const destroySession = (sessionId: string) => {
  sessions.delete(sessionId);
};
