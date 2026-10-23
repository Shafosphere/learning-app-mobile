import {
  NAVBAR_REACTION_POOLS as pools,
  getNavbarQuotePool,
  pickWeightedNavbarReaction,
  resolveNavbarMascotSource,
} from "../navbarMascotFaces";

describe("navbar weighted reaction pools", () => {
  it("reserves blinking for idle rather than event reactions", () => {
    for (const pool of Object.values(pools)) {
      for (const { variant } of pool) {
        expect(variant.face).not.toBe("blink");
        expect(variant.faceParts?.eyes).not.toBe("blink");
      }
    }
  });

  it.each([
    ["praise", ["happy", "cheerful", "blushed"], [55, 30, 15]],
    ["fast", ["ez", "xd", "sparkle"], [60, 25, 15]],
    ["mastery", ["love", "sparkle", "xd"], [60, 30, 10]],
    ["welcome", ["sparkle", "happy", "love"], [50, 30, 20]],
    ["hint", ["surprised", "owo", "nice"], [60, 30, 10]],
    ["loss", ["sad", "encouraging"], [70, 30]],
    ["night", ["sleep", "sleep-smile"], [70, 30]],
    ["general", ["nice", "cheerful"], [70, 30]],
    ["angry", ["angry", "angry-ez"], [80, 20]],
    ["crying", ["crying", "sad"], [70, 30]],
    ["ouch", ["sad", "surprised"], [70, 30]],
    ["sad", ["sad"], [100]], ["owo", ["owo"], [100]], ["blushed", ["blushed"], [100]],
    ["tapWarm", ["blushed", "cheerful"], [70, 30]],
    ["tapPlayful", ["xd", "ez", "owo"], [60, 25, 15]],
  ] as const)("matches the specified %s weights and variants", (name, ids, weights) => {
    expect(pools[name].map((item) => item.variant.id)).toEqual(ids);
    expect(pools[name].map((item) => item.weight)).toEqual(weights);
  });

  it.each(Object.entries(pools))("covers every boundary of %s with left-closed intervals", (_name, pool) => {
    expect(pool.reduce((sum, item) => sum + item.weight, 0)).toBe(100);
    let start = 0;
    for (const item of pool) {
      expect(Number.isInteger(item.weight)).toBe(true);
      expect(item.weight).toBeGreaterThan(0);
      expect(pickWeightedNavbarReaction(pool, start / 100)).toBe(item.variant);
      const end = start + item.weight;
      expect(pickWeightedNavbarReaction(pool, end / 100 - 0.000001)).toBe(item.variant);
      start = end;
    }
  });

  it("preserves mood when overriding individual layers", () => {
    expect(pickWeightedNavbarReaction(pools.angry, 0.8)).toMatchObject({
      face: "angry", faceParts: { eyes: "ez" }, motion: "shake",
    });
    expect(pickWeightedNavbarReaction(pools.night, 0.7)).toMatchObject({
      face: "sleep", faceParts: { mouth: "smile", zzz: false }, motion: "still",
    });
  });

  it.each([
    ["win_standard", "praise"], ["comeback", "praise"], ["startup_morning", "praise"],
    ["startup_day", "praise"], ["startup_evening", "praise"], ["win_fast", "fast"],
    ["win_mastery", "mastery"], ["streak", "mastery"], ["return", "welcome"],
    ["first_time", "welcome"], ["hint", "hint"], ["long_think", "hint"],
    ["loss", "loss"], ["startup_night", "night"], ["general", "general"], ["unknown", "general"], ["toString", "general"],
  ] as const)("maps %s to the %s family", (category, name) => {
    expect(getNavbarQuotePool("example", category)).toBe(pools[name]);
  });

  it.each([
    ["hint_1", "loss"], ["loss_3", "sad"], ["box_spam_0", "hint"], ["box_spam_1", "loss"],
    ["box_spam_2", "angry"], ["box_spam_3", "angry"], ["box_spam_4", "crying"], ["box_spam_5", "crying"],
    ["easter_0", "owo"], ["easter_1", "ouch"], ["easter_2", "angry"], ["easter_3", "blushed"],
  ] as const)("honors the %s override before the category", (id, name) => {
    expect(getNavbarQuotePool(id, "general")).toBe(pools[name]);
  });

  it("assigns explicit motion to each variant", () => {
    const expected: Record<string, string> = {
      happy: "bounce", cheerful: "bounce", sparkle: "bounce", love: "bounce", xd: "bounce",
      blushed: "tilt", ez: "lift", nice: "lift", owo: "lift", surprised: "lift",
      angry: "shake", "angry-ez": "shake", sad: "down", encouraging: "down", crying: "down",
      sleep: "still", "sleep-smile": "still",
    };
    for (const pool of Object.values(pools)) {
      for (const { variant } of pool) expect(variant.motion).toBe(expected[variant.id]);
    }
  });
});

describe("navbar reaction source priority", () => {
  const quote = { id: "win_mastery_0", category: "win_mastery", eventId: 3 };
  const tap = { id: 2, count: 2, rage: false, stage: "end" as const };
  it.each([
    ["calm", "praise"], ["angry", "loss"], ["disoriented", "hint"],
  ] as const)("prioritizes the %s popup over quotes and taps", (color, name) => {
    expect(resolveNavbarMascotSource({ popup: { id: 1, color }, quote, tap })).toEqual({ key: "popup-1", pool: pools[name] });
  });
  it("falls through quote, tap, and idle without drawing", () => {
    expect(resolveNavbarMascotSource({ popup: null, quote, tap })).toEqual({ key: "quote-3", pool: pools.mastery });
    expect(resolveNavbarMascotSource({ popup: null, quote: null, tap })).toEqual({ key: "tap-2-end", pool: pools.tapWarm });
    expect(resolveNavbarMascotSource({ popup: null, quote: null, tap: null })).toBeNull();
  });
});
