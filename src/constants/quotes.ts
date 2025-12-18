export type QuoteCategory =
  | "win"
  | "loss"
  | "startup"
  | "general"
  | "streak"
  | "comeback"
  | "long_think"
  | "box_spam"
  | "easter"
  | "return"
  | "hint"
  | "first_time";

export interface Quote {
  text: string;
  author?: string;
  category: QuoteCategory;
}

export const QUOTES: Quote[] = [
  // Startup (domyślny cytat startowy)
  {
    text: "hejo, co tam? :3",
    category: "startup",
  },
  {
    text: "Możemy zaczynać?",
    category: "startup",
  },
  {
    text: "Cześć :)",
    category: "startup",
  },
  {
    text: "Hejooo",
    category: "startup",
  },
  {
    text: "Dzień dobry, cześc i czołem!",
    category: "startup",
  },
  {
    text: "I kto za to płaci?",
    category: "startup",
  },
  {
    text: "OwO",
    category: "startup",
  },
  // First time (pierwsze uruchomienie)
  {
    text: "Uczyć się to nic innego jak przypominać sobie",
    category: "first_time",
  },
  {
    text: "Nie uczysz się po to, żeby wiedzieć. Uczysz się, żeby móc.",
    category: "first_time",
  },
  {
    text: "Trudne dziś oznacza łatwiejsze jutro.",
    category: "first_time",
  },
  {
    text: "Każdy ekspert był kiedyś początkujący.",
    category: "first_time",
  },
  {
    text: "Jedna strona dziennie to 365 stron rocznie.",
    category: "first_time",
  },
  {
    text: "Zmęczenie to sygnał, że pracujesz. Nie że masz przestać.”",
    category: "first_time",
  },
  // Return after break (>6h przerwy)
  {
    text: "cooo?! nie ja nie śpię!",
    category: "return",
  },
  {
    text: "wyłacz słońce przyciskiem drzemka >:c",
    category: "return",
  },
  // Win (ogólne sukcesy)
  {
    text: "yeeeeeeeey",
    category: "win",
  },
  {
    text: "Sigma",
    category: "win",
  },
  {
    text: ":D",
    category: "win",
  },
  {
    text: "piąteczka! :D",
    category: "win",
  },
  {
    text: "bly bly bly",
    category: "win",
  },
  // Streak (>=5 poprawnych z rzędu)
  {
    text: "ale lecisz :o",
    category: "streak",
  },
  {
    text: "ale urwał",
    category: "streak",
  },
  {
    text: "Hue hue hue hue",
    category: "streak",
  },
  // Comeback (trafienie po serii błędów)
  {
    text: "no w konću",
    category: "comeback",
  },
  {
    text: "Da się? Da się!",
    category: "comeback",
  },
  {
    text: "Wraaaacamy!! :3",
    category: "comeback",
  },
  {
    text: "a żeś mi teraz zaimponował",
    category: "comeback",
  },
  // Loss / Failure (nieudana próba)
  {
    text: "zaraza",
    category: "loss",
  },
  {
    text: "oj :c",
    category: "loss",
  },
  {
    text: "z dwojga złego lepiej w tę stronę",
    category: "loss",
  },
  {
    text: "nieeee!",
    category: "loss",
  },
  {
    text: ":(",
    category: "loss",
  },
  {
    text: "ale szpont poleciał",
    category: "loss",
  },
  // Long think (poprawna odpowiedź po dłuższym zastanowieniu)
  {
    text: "hmmmmm",
    category: "long_think",
  },
  {
    text: "tik tak tik tak...",
    category: "long_think",
  },
  {
    text: "ziew",
    category: "long_think",
  },
  // Hint / repeated fails (kilka błędów na tej samej fiszce)
  {
    text: "Może wpisz sobie podpowiedź w '...' miejscu? ",
    category: "hint",
  },
  {
    text: "Historia zatacza koło...",
    category: "hint",
  },
  {
    text: "Znowuuuu???",
    category: "hint",
  },
  {
    text: "Może zrób przerwe? Pozmywaj naczynia czy coś.",
    category: "hint",
  },
  {
    text: "To już nie błąd, to znajomy",
    category: "hint",
  },
  {
    text: "Przerabialiśmy to. I co? I nic.",
    category: "hint",
  },
  // Box spam (szybkie wielokrotne klikanie tego samego boxa)
  {
    text: "co tak go klikasz non stop?",
    category: "box_spam",
  },
  {
    text: "zostaw mojego braciaka! :c",
    category: "box_spam",
  },
  {
    text: "co on ci zrobił?",
    category: "box_spam",
  },
  {
    text: "ZOSTAW GO!",
    category: "box_spam",
  },

  // Easter (wielokrotne tapnięcia w logo w navbarze)
  {
    text: "oślepłem! oślepłem! czy jeszcze kiedys zagram na skrzypcach?!",
    category: "easter",
  },
  {
    text: "przestań! >:c",
    category: "easter",
  },
  {
    text: "dośc! >:c",
    category: "easter",
  },
  {
    text: ">:c",
    category: "easter",
  },
  {
    text: "nudzi ci sie? >:c",
    category: "easter",
  },
  // General / Fallback
  {
    text: "",
    category: "general",
  },
];
