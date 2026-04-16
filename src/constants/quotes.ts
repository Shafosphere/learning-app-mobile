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

export const QUOTES: Quote[] = [
  // --- Startup Time-Based ---
  // Morning (05:00 - 12:00)
  {
    text: "Dzień dobry! Kawa już była?",
    category: "startup_morning",
  },
  {
    text: "Wstawaj szkoda dnia! :D",
    category: "startup_morning",
  },
  {
    text: "Słoneczko świeci (chyba), czas na naukę.",
    category: "startup_morning",
  },
  {
    text: "Pora obudzić ten mózg.",
    category: "startup_morning",
  },

  // Day (12:00 - 18:00)
  {
    text: "Hejooo, co tam?",
    category: "startup_day",
  },
  {
    text: "Gotowy na powtóreczki?",
    category: "startup_day",
  },
  {
    text: "Działamy, działamy!",
    category: "startup_day",
  },
  {
    text: "Szybka sesyjka?",
    category: "startup_day",
  },

  // Evening (18:00 - 22:00)
  {
    text: "Wieczorne zakuwanie? Szanuję.",
    category: "startup_evening",
  },
  {
    text: "Dobry wieczór :)",
    category: "startup_evening",
  },
  {
    text: "Relaks przy fiszkach?",
    category: "startup_evening",
  },

  // Night (22:00 - 05:00)
  {
    text: "Jeszcze nie śpisz? :o",
    category: "startup_night",
  },
  {
    text: "Nocna zmiana widzę.",
    category: "startup_night",
  },
  {
    text: "Sowy górą!",
    category: "startup_night",
  },
  {
    text: "Tylko nie siedź do rana...",
    category: "startup_night",
  },

  // --- First Time (narazie wyłączyłem) --- 
  {
    text: "Uczyć się to nic innego jak przypominać sobie",
    category: "first_time",
  },
  {
    text: "Każdy ekspert był kiedyś początkujący.",
    category: "first_time",
  },

  // --- Return (long break) ---
  {
    text: "O, wróciłeś! Tęskniłem.",
    category: "return",
  },
  {
    text: "Dawno cię nie było!",
    category: "return",
  },

  // --- Wins ---
  // Win Fast (<3s)
  {
    text: "Speedrun?!",
    category: "win_fast",
  },
  {
    text: "Ale szybko!",
    category: "win_fast",
  },
  {
    text: "Błyskawica!",
    category: "win_fast",
  },
  {
    text: "EZ",
    category: "win_fast",
  },

  // Win Mastery (Box 5)
  {
    text: "Sigma.",
    category: "win_mastery",
  },
  {
    text: "Mistrzostwo świata!",
    category: "win_mastery",
  },
  {
    text: "Król/Królowa fiszek!",
    category: "win_mastery",
  },

  // Win Standard
  {
    text: "Tak jest!",
    category: "win_standard",
  },
  {
    text: "Dobra robota.",
    category: "win_standard",
  },
  {
    text: "Piąteczka! :D",
    category: "win_standard",
  },
  {
    text: ":D",
    category: "win_standard",
  },
  {
    text: "Lecisz z tym!",
    category: "win_standard",
  },

  // --- Streak ---
  {
    text: "Ale seria! :o",
    category: "streak",
  },
  {
    text: "Nie do zatrzymania!",
    category: "streak",
  },
  {
    text: "On fire! 🔥",
    category: "streak",
  },

  // --- Comeback ---
  {
    text: "No w końcu!",
    category: "comeback",
  },
  {
    text: "Wracamy do gry!",
    category: "comeback",
  },
  {
    text: "Odbicie od dna!",
    category: "comeback",
  },

  // --- Loss ---
  {
    text: "Oj...",
    category: "loss",
  },
  {
    text: "Zdarza się najlepszym.",
    category: "loss",
  },
  {
    text: "Następnym razem pójdzie lepiej.",
    category: "loss",
  },
  {
    text: ":(",
    category: "loss",
  },
  {
    text: "Głowa do góry.",
    category: "loss",
  },

  // --- Long Think ---
  {
    text: "Hmmmmm...",
    category: "long_think",
  },

  // --- Hints ---
  {
    text: "huh",
    category: "hint",
  },
  {
    text: "Znowu to samo? :(",
    category: "hint",
  },

  // --- Box Spam (Sequential) ---
  {
    text: "co tak go klikasz?",
    category: "box_spam",
    sequenceIndex: 0,
  },
  {
    text: "zostaw mojego braciaka! :c",
    category: "box_spam",
    sequenceIndex: 1,
  },
  {
    text: "przestań go klikać!",
    category: "box_spam",
    sequenceIndex: 2,
  },
  {
    text: "ZOSTAW GO!",
    category: "box_spam",
    sequenceIndex: 3,
  },
  {
    text: "...",
    category: "box_spam",
    sequenceIndex: 4,
  },
  {
    text: "serio, przestań.",
    category: "box_spam",
    sequenceIndex: 5,
  },

  // --- Easter ---
  {
    text: "OwO",
    category: "easter",
  },
  {
    text: "ała!",
    category: "easter",
  },
  {
    text: "przestań tykać logo >:<",
    category: "easter",
  },
  {
    text: "I kto za to płaci?",
    category: "easter",
  },

  // --- General Fallback ---
  {
    text: "Powodzenia!",
    category: "general",
  },
];

