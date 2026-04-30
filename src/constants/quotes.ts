export type QuoteCategory =
  | "win_standard"
  | "win_fast"
  | "win_mastery"
  | "loss"
  | "startup_morning"
  | "startup_day"
  | "startup_evening"
  | "startup_night"
  | "streak"
  | "comeback"
  | "long_think"
  | "box_spam"
  | "easter"
  | "return"
  | "hint"
  | "first_time"
  | "general";

export interface Quote {
  id: string;
  textKey: string;
  text: string;
  author?: string;
  category: QuoteCategory;
  /**
   * If set, this quote is part of a strict sequence.
   * The context will try to show sequenceIndex: 0, then 1, then 2...
   * Resets if cooldown expires or sequence finishes (looping depends on logic).
   */
  sequenceIndex?: number;
}

export type QuoteDefinition = Omit<Quote, "text" | "author"> & {
  authorKey?: string;
};

export const QUOTES: QuoteDefinition[] = [
  // --- Startup Time-Based ---
  // Morning (05:00 - 12:00)
  {
    id: "startup_morning_0",
    textKey: "quotes.reactions.startup_morning_0",
    category: "startup_morning",
  },
  {
    id: "startup_morning_1",
    textKey: "quotes.reactions.startup_morning_1",
    category: "startup_morning",
  },
  {
    id: "startup_morning_2",
    textKey: "quotes.reactions.startup_morning_2",
    category: "startup_morning",
  },
  {
    id: "startup_morning_3",
    textKey: "quotes.reactions.startup_morning_3",
    category: "startup_morning",
  },

  // Day (12:00 - 18:00)
  {
    id: "startup_day_0",
    textKey: "quotes.reactions.startup_day_0",
    category: "startup_day",
  },
  {
    id: "startup_day_1",
    textKey: "quotes.reactions.startup_day_1",
    category: "startup_day",
  },
  {
    id: "startup_day_2",
    textKey: "quotes.reactions.startup_day_2",
    category: "startup_day",
  },
  {
    id: "startup_day_3",
    textKey: "quotes.reactions.startup_day_3",
    category: "startup_day",
  },

  // Evening (18:00 - 22:00)
  {
    id: "startup_evening_0",
    textKey: "quotes.reactions.startup_evening_0",
    category: "startup_evening",
  },
  {
    id: "startup_evening_1",
    textKey: "quotes.reactions.startup_evening_1",
    category: "startup_evening",
  },
  {
    id: "startup_evening_2",
    textKey: "quotes.reactions.startup_evening_2",
    category: "startup_evening",
  },

  // Night (22:00 - 05:00)
  {
    id: "startup_night_0",
    textKey: "quotes.reactions.startup_night_0",
    category: "startup_night",
  },
  {
    id: "startup_night_1",
    textKey: "quotes.reactions.startup_night_1",
    category: "startup_night",
  },
  {
    id: "startup_night_2",
    textKey: "quotes.reactions.startup_night_2",
    category: "startup_night",
  },
  {
    id: "startup_night_3",
    textKey: "quotes.reactions.startup_night_3",
    category: "startup_night",
  },

  // --- First Time (narazie wyłączyłem) --- 
  {
    id: "first_time_0",
    textKey: "quotes.reactions.first_time_0",
    category: "first_time",
  },
  {
    id: "first_time_1",
    textKey: "quotes.reactions.first_time_1",
    category: "first_time",
  },

  // --- Return (long break) ---
  {
    id: "return_0",
    textKey: "quotes.reactions.return_0",
    category: "return",
  },
  {
    id: "return_1",
    textKey: "quotes.reactions.return_1",
    category: "return",
  },

  // --- Wins ---
  // Win Fast (<3s)
  {
    id: "win_fast_0",
    textKey: "quotes.reactions.win_fast_0",
    category: "win_fast",
  },
  {
    id: "win_fast_1",
    textKey: "quotes.reactions.win_fast_1",
    category: "win_fast",
  },
  {
    id: "win_fast_2",
    textKey: "quotes.reactions.win_fast_2",
    category: "win_fast",
  },
  {
    id: "win_fast_3",
    textKey: "quotes.reactions.win_fast_3",
    category: "win_fast",
  },

  // Win Mastery (Box 5)
  {
    id: "win_mastery_0",
    textKey: "quotes.reactions.win_mastery_0",
    category: "win_mastery",
  },
  {
    id: "win_mastery_1",
    textKey: "quotes.reactions.win_mastery_1",
    category: "win_mastery",
  },
  {
    id: "win_mastery_2",
    textKey: "quotes.reactions.win_mastery_2",
    category: "win_mastery",
  },

  // Win Standard
  {
    id: "win_standard_0",
    textKey: "quotes.reactions.win_standard_0",
    category: "win_standard",
  },
  {
    id: "win_standard_1",
    textKey: "quotes.reactions.win_standard_1",
    category: "win_standard",
  },
  {
    id: "win_standard_2",
    textKey: "quotes.reactions.win_standard_2",
    category: "win_standard",
  },
  {
    id: "win_standard_3",
    textKey: "quotes.reactions.win_standard_3",
    category: "win_standard",
  },
  {
    id: "win_standard_4",
    textKey: "quotes.reactions.win_standard_4",
    category: "win_standard",
  },

  // --- Streak ---
  {
    id: "streak_0",
    textKey: "quotes.reactions.streak_0",
    category: "streak",
  },
  {
    id: "streak_1",
    textKey: "quotes.reactions.streak_1",
    category: "streak",
  },
  {
    id: "streak_2",
    textKey: "quotes.reactions.streak_2",
    category: "streak",
  },

  // --- Comeback ---
  {
    id: "comeback_0",
    textKey: "quotes.reactions.comeback_0",
    category: "comeback",
  },
  {
    id: "comeback_1",
    textKey: "quotes.reactions.comeback_1",
    category: "comeback",
  },
  {
    id: "comeback_2",
    textKey: "quotes.reactions.comeback_2",
    category: "comeback",
  },

  // --- Loss ---
  {
    id: "loss_0",
    textKey: "quotes.reactions.loss_0",
    category: "loss",
  },
  {
    id: "loss_1",
    textKey: "quotes.reactions.loss_1",
    category: "loss",
  },
  {
    id: "loss_2",
    textKey: "quotes.reactions.loss_2",
    category: "loss",
  },
  {
    id: "loss_3",
    textKey: "quotes.reactions.loss_3",
    category: "loss",
  },
  {
    id: "loss_4",
    textKey: "quotes.reactions.loss_4",
    category: "loss",
  },

  // --- Long Think ---
  {
    id: "long_think_0",
    textKey: "quotes.reactions.long_think_0",
    category: "long_think",
  },

  // --- Hints ---
  {
    id: "hint_0",
    textKey: "quotes.reactions.hint_0",
    category: "hint",
  },
  {
    id: "hint_1",
    textKey: "quotes.reactions.hint_1",
    category: "hint",
  },

  // --- Box Spam (Sequential) ---
  {
    id: "box_spam_0",
    textKey: "quotes.reactions.box_spam_0",
    category: "box_spam",
    sequenceIndex: 0,
  },
  {
    id: "box_spam_1",
    textKey: "quotes.reactions.box_spam_1",
    category: "box_spam",
    sequenceIndex: 1,
  },
  {
    id: "box_spam_2",
    textKey: "quotes.reactions.box_spam_2",
    category: "box_spam",
    sequenceIndex: 2,
  },
  {
    id: "box_spam_3",
    textKey: "quotes.reactions.box_spam_3",
    category: "box_spam",
    sequenceIndex: 3,
  },
  {
    id: "box_spam_4",
    textKey: "quotes.reactions.box_spam_4",
    category: "box_spam",
    sequenceIndex: 4,
  },
  {
    id: "box_spam_5",
    textKey: "quotes.reactions.box_spam_5",
    category: "box_spam",
    sequenceIndex: 5,
  },

  // --- Easter ---
  {
    id: "easter_0",
    textKey: "quotes.reactions.easter_0",
    category: "easter",
  },
  {
    id: "easter_1",
    textKey: "quotes.reactions.easter_1",
    category: "easter",
  },
  {
    id: "easter_2",
    textKey: "quotes.reactions.easter_2",
    category: "easter",
  },
  {
    id: "easter_3",
    textKey: "quotes.reactions.easter_3",
    category: "easter",
  },

  // --- General Fallback ---
  {
    id: "general_0",
    textKey: "quotes.reactions.general_0",
    category: "general",
  },
];
