type Quote = {
  text: string;
  author: string;
};

export const HOME_QUOTES_TRANSLATION_KEY = "screens.home.home.home.quotes";

export function normalizeHomeQuotes(value: unknown): Quote[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (quote): quote is Quote =>
      typeof quote === "object" &&
      quote !== null &&
      typeof (quote as Quote).text === "string" &&
      typeof (quote as Quote).author === "string"
  );
}
