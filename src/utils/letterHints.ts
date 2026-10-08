import type { LetterHintProfile, LetterHintSettings } from "@/src/contexts/settings/types";
import type { BoxesState } from "@/src/types/boxes";
import { resolveInputKind } from "./answerInputKind";
import { splitGraphemes } from "./graphemes";

export const LETTER_HINT_PRESETS = {
  gentle: { boxOneLimit: 1, boxTwoLimit: 0 },
  standard: { boxOneLimit: 2, boxTwoLimit: 1 },
  stronger: { boxOneLimit: 3, boxTwoLimit: 2 },
} as const;

export const DEFAULT_LETTER_HINT_SETTINGS: LetterHintSettings = {
  enabled: false,
  profile: "standard",
  ...LETTER_HINT_PRESETS.standard,
};

export function selectLetterHintProfile(
  settings: LetterHintSettings,
  profile: LetterHintProfile,
): LetterHintSettings {
  return {
    ...settings,
    profile,
    ...(profile === "custom" ? {} : LETTER_HINT_PRESETS[profile]),
  };
}

export function normalizeLetterHintSettings(value: unknown): LetterHintSettings {
  if (!value || typeof value !== "object") return DEFAULT_LETTER_HINT_SETTINGS;
  const raw = value as Partial<LetterHintSettings>;
  const profile =
    raw.profile === "gentle" || raw.profile === "stronger" || raw.profile === "custom"
      ? raw.profile
      : "standard";
  const limit = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isInteger(value)
      ? Math.max(0, Math.min(3, value))
      : fallback;
  return selectLetterHintProfile(
    {
      enabled: raw.enabled === true,
      profile,
      boxOneLimit: limit(raw.boxOneLimit, 2),
      boxTwoLimit: limit(raw.boxTwoLimit, 1),
    },
    profile,
  );
}

/** Returns only a safe prefix, never a value to insert into the answer field. */
export function resolveLetterHint({
  settings,
  answers,
  activeBox,
}: {
  settings: LetterHintSettings;
  answers: string[];
  activeBox: keyof BoxesState | null;
}): string {
  if (!settings.enabled || (activeBox !== "boxOne" && activeBox !== "boxTwo")) {
    return "";
  }
  const limit = activeBox === "boxOne" ? settings.boxOneLimit : settings.boxTwoLimit;
  if (limit <= 0) return "";
  const answer = (answers[0] ?? "").trim().normalize("NFC");
  if (resolveInputKind([answer]) !== "text" || /\p{N}/u.test(answer)) return "";
  // Restrict to ordinary prose. Math markup, operators and leading symbols are ineligible.
  if (!/^[\p{L}][\p{L}\p{M}\s’'.,!?;:()\-]*$/u.test(answer)) return "";
  const firstWord = answer.match(/^[\p{L}\p{M}]+/u)?.[0] ?? "";
  const letters = splitGraphemes(firstWord);
  const safeLimit = letters.length < 3 ? 0 : letters.length < 6 ? 1 : letters.length < 9 ? 2 : 3;
  return letters.slice(0, Math.min(3, Math.floor(limit), safeLimit)).join("");
}
