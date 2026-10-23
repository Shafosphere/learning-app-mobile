import type { BoxFaceParts, Face } from "@/src/components/Box/Skin/boxFaces";

export type NavbarReactionMotion = "bounce" | "tilt" | "lift" | "shake" | "down" | "still";
export type NavbarReactionVariant = {
  id: string;
  face: Face;
  faceParts?: Partial<BoxFaceParts>;
  motion: NavbarReactionMotion;
};
export type WeightedNavbarReaction = { weight: number; variant: NavbarReactionVariant };
export type NavbarReactionPool = readonly [WeightedNavbarReaction, ...WeightedNavbarReaction[]];

function variant(face: Face, motion: NavbarReactionMotion, faceParts?: Partial<BoxFaceParts>, id: string = face): NavbarReactionVariant {
  return { id, face, motion, ...(faceParts ? { faceParts } : {}) };
}
const variants = {
  happy: variant("happy", "bounce"),
  cheerful: variant("cheerful", "bounce"),
  blushed: variant("blushed", "tilt"),
  ez: variant("ez", "lift"),
  xd: variant("xd", "bounce"),
  sparkle: variant("sparkle", "bounce"),
  love: variant("love", "bounce"),
  surprised: variant("surprised", "lift"),
  owo: variant("owo", "lift"),
  nice: variant("nice", "lift"),
  sad: variant("sad", "down"),
  encouraging: variant("encouraging", "down"),
  crying: variant("crying", "down"),
  angry: variant("angry", "shake"),
  angryEz: variant("angry", "shake", { eyes: "ez" }, "angry-ez"),
  sleep: variant("sleep", "still"),
  sleepSmile: variant("sleep", "still", { mouth: "smile", zzz: false }, "sleep-smile"),
};
const entry = (variant: NavbarReactionVariant, weight: number): WeightedNavbarReaction => ({ variant, weight });

export const NAVBAR_REACTION_POOLS = {
  praise: [entry(variants.happy, 55), entry(variants.cheerful, 30), entry(variants.blushed, 15)],
  fast: [entry(variants.ez, 60), entry(variants.xd, 25), entry(variants.sparkle, 15)],
  mastery: [entry(variants.love, 60), entry(variants.sparkle, 30), entry(variants.xd, 10)],
  welcome: [entry(variants.sparkle, 50), entry(variants.happy, 30), entry(variants.love, 20)],
  hint: [entry(variants.surprised, 60), entry(variants.owo, 30), entry(variants.nice, 10)],
  loss: [entry(variants.sad, 70), entry(variants.encouraging, 30)],
  night: [entry(variants.sleep, 70), entry(variants.sleepSmile, 30)],
  general: [entry(variants.nice, 70), entry(variants.cheerful, 30)],
  angry: [entry(variants.angry, 80), entry(variants.angryEz, 20)],
  crying: [entry(variants.crying, 70), entry(variants.sad, 30)],
  ouch: [entry(variants.sad, 70), entry(variants.surprised, 30)],
  sad: [entry(variants.sad, 100)],
  owo: [entry(variants.owo, 100)],
  blushed: [entry(variants.blushed, 100)],
  tapWarm: [entry(variants.blushed, 70), entry(variants.cheerful, 30)],
  tapPlayful: [entry(variants.xd, 60), entry(variants.ez, 25), entry(variants.owo, 15)],
} satisfies Record<string, NavbarReactionPool>;

/** randomValue is in [0, 1); each weighted interval includes its lower bound. */
export function pickWeightedNavbarReaction(pool: NavbarReactionPool, randomValue: number): NavbarReactionVariant {
  let cumulative = 0;
  for (const item of pool) {
    cumulative += item.weight;
    if (randomValue < cumulative / 100) return item.variant;
  }
  return pool[pool.length - 1].variant;
}

const QUOTE_OVERRIDES = new Map<string, NavbarReactionPool>(Object.entries({
  hint_1: NAVBAR_REACTION_POOLS.loss,
  loss_3: NAVBAR_REACTION_POOLS.sad,
  box_spam_0: NAVBAR_REACTION_POOLS.hint,
  box_spam_1: NAVBAR_REACTION_POOLS.loss,
  box_spam_2: NAVBAR_REACTION_POOLS.angry,
  box_spam_3: NAVBAR_REACTION_POOLS.angry,
  box_spam_4: NAVBAR_REACTION_POOLS.crying,
  box_spam_5: NAVBAR_REACTION_POOLS.crying,
  easter_0: NAVBAR_REACTION_POOLS.owo,
  easter_1: NAVBAR_REACTION_POOLS.ouch,
  easter_2: NAVBAR_REACTION_POOLS.angry,
  easter_3: NAVBAR_REACTION_POOLS.blushed,
}));
const QUOTE_POOLS = new Map<string, NavbarReactionPool>(Object.entries({
  win_standard: NAVBAR_REACTION_POOLS.praise,
  comeback: NAVBAR_REACTION_POOLS.praise,
  startup_morning: NAVBAR_REACTION_POOLS.praise,
  startup_day: NAVBAR_REACTION_POOLS.praise,
  startup_evening: NAVBAR_REACTION_POOLS.praise,
  win_fast: NAVBAR_REACTION_POOLS.fast,
  win_mastery: NAVBAR_REACTION_POOLS.mastery,
  streak: NAVBAR_REACTION_POOLS.mastery,
  return: NAVBAR_REACTION_POOLS.welcome,
  first_time: NAVBAR_REACTION_POOLS.welcome,
  hint: NAVBAR_REACTION_POOLS.hint,
  long_think: NAVBAR_REACTION_POOLS.hint,
  loss: NAVBAR_REACTION_POOLS.loss,
  startup_night: NAVBAR_REACTION_POOLS.night,
}));
export function getNavbarQuotePool(id: string, category: string): NavbarReactionPool {
  return QUOTE_OVERRIDES.get(id) ?? QUOTE_POOLS.get(category) ?? NAVBAR_REACTION_POOLS.general;
}
export type NavbarPopupReaction = { id: number; color: "calm" | "angry" | "disoriented" };
export type NavbarQuoteReaction = { id: string; category: string; eventId: number };
export type NavbarTapPhase = { id: number; count: number; rage: boolean; stage: "start" | "end" | "single" };
export type NavbarReactionSource = { key: string; pool: NavbarReactionPool };

export function resolveNavbarMascotSource({ popup, quote, tap }: {
  popup: NavbarPopupReaction | null;
  quote: NavbarQuoteReaction | null;
  tap: NavbarTapPhase | null;
}): NavbarReactionSource | null {
  if (popup) return {
    key: `popup-${popup.id}`,
    pool: popup.color === "angry" ? NAVBAR_REACTION_POOLS.loss
      : popup.color === "disoriented" ? NAVBAR_REACTION_POOLS.hint : NAVBAR_REACTION_POOLS.praise,
  };
  if (quote) return { key: `quote-${quote.eventId}`, pool: getNavbarQuotePool(quote.id, quote.category) };
  if (tap) return {
    key: `tap-${tap.id}-${tap.stage}`,
    pool: tap.rage ? NAVBAR_REACTION_POOLS.angry
      : tap.count >= 3 ? NAVBAR_REACTION_POOLS.tapPlayful
      : tap.stage === "start" ? NAVBAR_REACTION_POOLS.owo : NAVBAR_REACTION_POOLS.tapWarm,
  };
  return null;
}
