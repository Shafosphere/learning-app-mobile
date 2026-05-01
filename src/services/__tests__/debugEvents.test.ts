import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  DEBUG_EVENTS_STORAGE_KEY,
  appendBoxesDropAlert,
  appendDebugEvent,
  getBoxCardIds,
  shouldLogBoxesDropAlert,
  summarizeBoxes,
} from "@/src/services/debugEvents";
import type { BoxesState, WordWithTranslations } from "@/src/types/boxes";

const makeCard = (id: number): WordWithTranslations => ({
  id,
  text: `card-${id}`,
  translations: [`translation-${id}`],
  flipped: false,
  answerOnly: false,
  hintFront: null,
  hintBack: null,
  imageFront: null,
  imageBack: null,
  explanation: null,
  type: "text",
});

const makeBoxes = (overrides: Partial<BoxesState> = {}): BoxesState => ({
  boxZero: [],
  boxOne: [],
  boxTwo: [],
  boxThree: [],
  boxFour: [],
  boxFive: [],
  ...overrides,
});

describe("debugEvents", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("keeps the latest 2000 events", async () => {
    for (let index = 0; index < 2005; index += 1) {
      await appendDebugEvent("test", "event", { index });
    }

    const raw = await AsyncStorage.getItem(DEBUG_EVENTS_STORAGE_KEY);
    const events = JSON.parse(raw ?? "[]");

    expect(events).toHaveLength(2000);
    expect(events[0].payload.index).toBe(5);
    expect(events[1999].payload.index).toBe(2004);
  });

  it("summarizes boxes and card ids without card text", () => {
    const boxes = makeBoxes({
      boxZero: [makeCard(1)],
      boxOne: [makeCard(2), makeCard(3)],
      boxFive: [makeCard(9)],
    });

    expect(summarizeBoxes(boxes)).toEqual({
      boxZero: 1,
      boxOne: 2,
      boxTwo: 0,
      boxThree: 0,
      boxFour: 0,
      boxFive: 1,
      total: 4,
    });
    expect(getBoxCardIds(boxes)).toEqual({
      boxZero: [1],
      boxOne: [2, 3],
      boxTwo: [],
      boxThree: [],
      boxFour: [],
      boxFive: [9],
    });
  });

  it("logs drop alerts only for sudden drops", async () => {
    const before = makeBoxes({
      boxOne: Array.from({ length: 10 }, (_, index) => makeCard(index + 1)),
    });
    const smallMove = makeBoxes({
      boxOne: Array.from({ length: 9 }, (_, index) => makeCard(index + 1)),
      boxTwo: [makeCard(10)],
    });
    const afterDrop = makeBoxes({
      boxOne: [makeCard(1), makeCard(2), makeCard(3)],
    });

    expect(shouldLogBoxesDropAlert(before, smallMove)).toBe(false);
    expect(shouldLogBoxesDropAlert(before, afterDrop)).toBe(true);

    await appendBoxesDropAlert("boxes", {
      before,
      after: smallMove,
      context: { storageKey: "customBoxes:test" },
    });
    await appendBoxesDropAlert("boxes", {
      before,
      after: afterDrop,
      context: { storageKey: "customBoxes:test" },
    });

    const raw = await AsyncStorage.getItem(DEBUG_EVENTS_STORAGE_KEY);
    const events = JSON.parse(raw ?? "[]");

    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("boxes.drop_alert");
    expect(events[0].payload.deltaTotal).toBe(-7);
  });
});
