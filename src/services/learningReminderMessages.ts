import type {
  ReminderSeriesSlot,
  SmartReminderProfile,
} from "@/src/services/smartReminders";

type ReminderMessageLanguage = "pl" | "en";
type ReminderMessageProfile = Exclude<SmartReminderProfile, "unknown"> | "universal";
type ReminderMessageCatalog = Record<
  ReminderMessageProfile,
  Record<ReminderSeriesSlot, string[]>
>;

const PROFILE_ORDER: SmartReminderProfile[] = [
  "morning",
  "afternoon",
  "evening",
  "night",
  "unknown",
];
const SLOT_ORDER: ReminderSeriesSlot[] = ["lead", "due", "followUp"];

const CATALOGS: Record<ReminderMessageLanguage, ReminderMessageCatalog> = {
  pl: {
    morning: {
      lead: [
        "Dzień dobry! Za chwilkę czas na małą rundkę fiszek :3",
        "Fiszki już się przeciągają i czekają na Ciebie",
      ],
      due: [
        "To Twoja pora na fiszki! Wpadniesz na chwilkę?",
        "Poranna misja wiedzy gotowa do startu :D",
      ],
      followUp: [
        "Hej, poranek jeszcze trwa, fiszki dalej czekają",
        "Mała powtórka po śniadanku? Brzmi dobrze :3",
      ],
    },
    afternoon: {
      lead: [
        "Za chwilę idealny moment na fiszkii",
        "Fiszki szykują się na mały trening pamięci :D",
      ],
      due: [
        "Hop! To dobry moment, żeby wrócić do fiszek",
        "Południowa porcja wiedzy już gotowa",
      ],
      followUp: [
        "Chyba minęła nas fiszkowa pora… nadrobimy? :3",
        "Jeszcze możesz złapać dzisiejszą rundkę fiszek",
      ],
    },
    evening: {
      lead: [
        "Wieczór się zbliża, a fiszki mają ochotę na spotkanie",
        "Za chwilkę spokojna rundka na koniec dnia :3",
      ],
      due: [
        "To teraz! Fiszki czekają na Twój powrót",
        "Wieczorna powtórka? Tylko kilka minutek",
      ],
      followUp: [
        "Fiszki jeszcze nie śpią, może krótka rundka?",
        "Dzień prawie za nami, ale wiedza nadal czeka :D",
      ],
    },
    night: {
      lead: [
        "Psst… za chwilkę Twoja nocna pora na fiszki",
        "Fiszki już zakładają piżamki, ale jeszcze czekają :3",
      ],
      due: ["Cicha nocna rundka fiszek?", "Ej, śpisz?"],
      followUp: [
        "Jeszcze nie śpisz? Fiszki mrugają do Ciebie :3",
        "Ostatnia malutka powtórka przed snem?",
      ],
    },
    universal: {
      lead: [
        "Za chwilkę Twoja pora na fiszki",
        "Fiszki już czekają i robią małe hop :3",
        "Nadchodzi czas na krótką powtórkę",
        "Jeszcze momencik i zaczynamy fiszkową misję",
      ],
      due: [
        "To teraz! Wróć do fiszek na chwilkę",
        "Fiszki są gotowe. Ty też? :D",
        "Czas na małą porcję wiedzy",
        "Twoja seria fiszek czeka na kontynuację",
      ],
      followUp: [
        "Ojej, chyba ominęła nas pora fiszek",
        "Fiszki nadal tu są i grzecznie czekają :3",
        "Może szybciutko nadrobimy dzisiejszą rundkę?",
        "Jeszcze możesz wrócić i zrobić mały postęp :*",
      ],
    },
  },
  en: {
    morning: {
      lead: [
        "Good morning! In a little bit, it is time for a tiny flashcard round :3",
        "The flashcards are already stretching and waiting for you",
      ],
      due: [
        "It is your flashcard time! Coming by for a minute?",
        "Your morning knowledge mission is ready for launch :D",
      ],
      followUp: [
        "Hey, morning is still here, and the flashcards are still waiting",
        "A tiny review after breakfast? Sounds good :3",
      ],
    },
    afternoon: {
      lead: [
        "In a little bit, it is the perfect moment for flashcardss",
        "The flashcards are getting ready for a small memory workout :D",
      ],
      due: [
        "Hop! This is a good moment to come back to your flashcards",
        "Your midday dose of knowledge is ready",
      ],
      followUp: [
        "Looks like flashcard time slipped by… shall we catch up? :3",
        "You can still catch today's flashcard round",
      ],
    },
    evening: {
      lead: [
        "Evening is getting closer, and the flashcards feel like meeting up",
        "In a little bit, a calm round to end the day :3",
      ],
      due: [
        "Now is the time! Your flashcards are waiting for your return",
        "Evening review? Just a few little minutes",
      ],
      followUp: [
        "The flashcards are not asleep yet, maybe a short round?",
        "The day is almost behind us, but knowledge is still waiting :D",
      ],
    },
    night: {
      lead: [
        "Psst… in a little bit, it is your nighttime flashcard time",
        "The flashcards are putting on pajamas, but they are still waiting :3",
      ],
      due: ["A quiet nighttime flashcard round?", "Hey, are you asleep?"],
      followUp: [
        "Still awake? The flashcards are blinking at you :3",
        "One last tiny review before sleep?",
      ],
    },
    universal: {
      lead: [
        "In a little bit, it is your flashcard time",
        "The flashcards are already waiting and doing a little hop :3",
        "A short review is coming up",
        "Just a moment and the flashcard mission begins",
      ],
      due: [
        "Now is the time! Come back to your flashcards for a minute",
        "The flashcards are ready. Are you? :D",
        "Time for a small dose of knowledge",
        "Your flashcard streak is waiting to continue",
      ],
      followUp: [
        "Oh no, looks like flashcard time slipped by",
        "The flashcards are still here and politely waiting :3",
        "Maybe we can quickly catch up on today's round?",
        "You can still come back and make a little progress :*",
      ],
    },
  },
};

function toLocalDayOrdinal(value: Date): number {
  return Math.floor(
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) /
      (24 * 60 * 60 * 1000)
  );
}

function getPool(
  language: ReminderMessageLanguage,
  profile: SmartReminderProfile,
  slot: ReminderSeriesSlot
): string[] {
  const catalog = CATALOGS[language];
  if (profile === "unknown") {
    return catalog.universal[slot];
  }
  return [...catalog[profile][slot], ...catalog.universal[slot]];
}

export function normalizeReminderMessageLanguage(
  language: string | null | undefined
): ReminderMessageLanguage {
  return language?.toLowerCase().startsWith("en") ? "en" : "pl";
}

export function getLearningReminderNotificationTitle(
  language: string | null | undefined
): string {
  return normalizeReminderMessageLanguage(language) === "en"
    ? "Flashcard time"
    : "Czas na fiszki";
}

export function selectLearningReminderNotificationBody(input: {
  language: string | null | undefined;
  profile: SmartReminderProfile;
  slot: ReminderSeriesSlot;
  scheduledAt: Date;
}): string {
  const language = normalizeReminderMessageLanguage(input.language);
  const pool = getPool(language, input.profile, input.slot);
  const profileIndex = PROFILE_ORDER.indexOf(input.profile);
  const slotIndex = SLOT_ORDER.indexOf(input.slot);
  const index =
    (toLocalDayOrdinal(input.scheduledAt) + profileIndex * 7 + slotIndex * 13) %
    pool.length;

  return pool[index];
}

