const SHORT_WORDS_PATTERN =
  /(^|[\s(])([aiouwzAIOUWZ])\s+/g;

export const preventWidowsPl = (text: string): string =>
  text.replace(SHORT_WORDS_PATTERN, (_, prefix: string, word: string) => {
    return `${prefix}${word}\u00A0`;
  });
