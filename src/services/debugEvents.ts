import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BoxesState } from "@/src/types/boxes";

export const DEBUG_EVENTS_STORAGE_KEY = "debugEvents:v1";
export const MAX_DEBUG_EVENTS = 2000;
const DROP_ALERT_MIN_CARD_COUNT = 5;
const DROP_ALERT_MIN_RATIO = 0.3;

const BOX_ORDER: (keyof BoxesState)[] = [
  "boxZero",
  "boxOne",
  "boxTwo",
  "boxThree",
  "boxFour",
  "boxFive",
];

export type DebugEvent = {
  ts: number;
  area: string;
  event: string;
  payload?: Record<string, unknown>;
};

export type DebugContext = {
  screen: "flashcards" | "review";
  courseId?: number | null;
  storageKey?: string;
};

export type BoxesSummary = Record<keyof BoxesState, number> & {
  total: number;
};

export type BoxCardIds = Record<keyof BoxesState, number[]>;

let debugEventWriteQueue: Promise<void> = Promise.resolve();

export function summarizeBoxes(boxes: BoxesState): BoxesSummary {
  const summary = {
    boxZero: boxes.boxZero?.length ?? 0,
    boxOne: boxes.boxOne?.length ?? 0,
    boxTwo: boxes.boxTwo?.length ?? 0,
    boxThree: boxes.boxThree?.length ?? 0,
    boxFour: boxes.boxFour?.length ?? 0,
    boxFive: boxes.boxFive?.length ?? 0,
    total: 0,
  };

  summary.total = BOX_ORDER.reduce((sum, box) => sum + summary[box], 0);
  return summary;
}

export function getBoxCardIds(boxes: BoxesState): BoxCardIds {
  return {
    boxZero: (boxes.boxZero ?? []).map((card) => card.id),
    boxOne: (boxes.boxOne ?? []).map((card) => card.id),
    boxTwo: (boxes.boxTwo ?? []).map((card) => card.id),
    boxThree: (boxes.boxThree ?? []).map((card) => card.id),
    boxFour: (boxes.boxFour ?? []).map((card) => card.id),
    boxFive: (boxes.boxFive ?? []).map((card) => card.id),
  };
}

export async function appendDebugEvent(
  area: string,
  event: string,
  payload?: Record<string, unknown>
): Promise<void> {
  debugEventWriteQueue = debugEventWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const raw = await AsyncStorage.getItem(DEBUG_EVENTS_STORAGE_KEY);
      const previous = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(previous) ? previous : [];
      const next: DebugEvent[] = [
        ...list.slice(-(MAX_DEBUG_EVENTS - 1)),
        {
          ts: Date.now(),
          area,
          event,
          payload,
        },
      ];

      await AsyncStorage.setItem(DEBUG_EVENTS_STORAGE_KEY, JSON.stringify(next));
    })
    .catch((error) => {
      console.warn("[debugEvents] Failed to append event", error);
    });

  await debugEventWriteQueue;
}

export function shouldLogBoxesDropAlert(
  before: BoxesState,
  after: BoxesState
): boolean {
  const beforeTotal = summarizeBoxes(before).total;
  const afterTotal = summarizeBoxes(after).total;
  const drop = beforeTotal - afterTotal;

  if (drop < DROP_ALERT_MIN_CARD_COUNT || beforeTotal <= 0) {
    return false;
  }

  return drop / beforeTotal >= DROP_ALERT_MIN_RATIO;
}

export async function appendBoxesDropAlert(
  area: string,
  payload: {
    before: BoxesState;
    after: BoxesState;
    context?: Record<string, unknown>;
  }
): Promise<void> {
  if (!shouldLogBoxesDropAlert(payload.before, payload.after)) {
    return;
  }

  const beforeCounts = summarizeBoxes(payload.before);
  const afterCounts = summarizeBoxes(payload.after);

  await appendDebugEvent(area, "boxes.drop_alert", {
    ...payload.context,
    beforeCounts,
    afterCounts,
    deltaTotal: afterCounts.total - beforeCounts.total,
    beforeCardIds: getBoxCardIds(payload.before),
    afterCardIds: getBoxCardIds(payload.after),
  });
}
