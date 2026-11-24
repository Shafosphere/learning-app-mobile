import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import elements from "@/src/constants/chemicalElements.json";
import type { WordWithTranslations } from "@/src/types/boxes";
import { getChemicalElement, PeriodicElementContext, PeriodicElementPrompt } from "../PeriodicElementPrompt";

const hydrogen: WordWithTranslations = {
  id: 1, externalId: "0001", text: "H", translations: ["wodór"], flipped: false,
};

function prompt(text: string, revealAnswer = false, word: WordWithTranslations | null = hydrogen) {
  return (
    <PeriodicElementContext.Provider value={{ element: getChemicalElement(word), revealAnswer }}>
      <PeriodicElementPrompt text={text}><Text>{text}</Text></PeriodicElementPrompt>
    </PeriodicElementContext.Provider>
  );
}

it("recognizes all 118 source records and rejects unrelated or edited cards", () => {
  expect(elements).toHaveLength(118);
  for (const element of elements) {
    expect(getChemicalElement({ ...hydrogen, externalId: String(element.atomicNumber).padStart(4, "0"),
      text: element.symbol, translations: [element.name] })).toEqual(element);
    expect(getChemicalElement({ ...hydrogen, externalId: String(element.atomicNumber).padStart(4, "0"),
      text: element.symbol, translations: [element.nameEn] })).toEqual({ ...element, name: element.nameEn });
  }
  expect(getChemicalElement(null)).toBeNull();
  expect(getChemicalElement({ ...hydrogen, translations: ["inna odpowiedź"] })).toBeNull();
  expect(getChemicalElement({ ...hydrogen, externalId: "0002" })).toBeNull();
  expect(getChemicalElement({ ...hydrogen, externalId: undefined })).toBeNull();
});

it("uses the card's English name in both directions and during introduction", () => {
  const englishHydrogen = { ...hydrogen, translations: ["Hydrogen"] };
  const screen = render(prompt("H", false, englishHydrogen));
  expect(screen.getByText("1")).toBeTruthy();
  expect(screen.getByText("H")).toBeTruthy();
  expect(screen.getByText("?")).toBeTruthy();
  expect(screen.queryByText("Hydrogen")).toBeNull();
  screen.rerender(prompt("Hydrogen", false, englishHydrogen));
  expect(screen.getByText("Hydrogen")).toBeTruthy();
  expect(screen.queryByText("H")).toBeNull();
  screen.rerender(prompt("H", true, englishHydrogen));
  expect(screen.getByText("H")).toBeTruthy();
  expect(screen.getByText("Hydrogen")).toBeTruthy();
  expect(screen.queryByText("wodór")).toBeNull();
  expect(screen.queryByText("?")).toBeNull();
});

it("does not reveal the name or symbol being tested, including after changing direction", () => {
  const screen = render(prompt("H"));
  expect(screen.getByText("1")).toBeTruthy();
  expect(screen.getByText("H")).toBeTruthy();
  expect(screen.queryByText("wodór")).toBeNull();
  expect(screen.getByText("?")).toBeTruthy();
  screen.rerender(prompt("wodór"));
  expect(screen.getByText("wodór")).toBeTruthy();
  expect(screen.queryByText("H")).toBeNull();
  expect(screen.getByText("?")).toBeTruthy();
});

it("shows both sides during introduction and falls back to text for other cards", () => {
  const screen = render(prompt("H", true));
  expect(screen.getByText("H")).toBeTruthy();
  expect(screen.getByText("wodór")).toBeTruthy();
  expect(screen.queryByText("?")).toBeNull();
  screen.rerender(prompt("zwykłe pytanie", false, null));
  expect(screen.getByText("zwykłe pytanie")).toBeTruthy();
  expect(screen.queryByText("1")).toBeNull();
});
