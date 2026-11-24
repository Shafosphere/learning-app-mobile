import { createContext, useContext, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import elements from "@/src/constants/chemicalElements.json";
import type { WordWithTranslations } from "@/src/types/boxes";

type ChemicalElement = (typeof elements)[number];

// Match the complete source record, so ordinary cards containing e.g. "I" stay text.
export function getChemicalElement(word: WordWithTranslations | null): ChemicalElement | null {
  if (!word?.externalId || !/^\d+$/.test(word.externalId)) return null;
  const element = elements.find(element =>
    element.atomicNumber === Number(word.externalId) &&
    element.symbol === word.text &&
    word.translations.length === 1 &&
    (word.translations[0] === element.name || word.translations[0] === element.nameEn)
  ) ?? null;
  return element ? { ...element, name: word.translations[0] } : null;
}

export const PeriodicElementContext = createContext<{
  element: ChemicalElement | null;
  revealAnswer: boolean;
}>({ element: null, revealAnswer: false });

const familyColors: Record<string, string> = {
  "niemetal": "#F7D4A8",
  "gaz szlachetny": "#CED8FA",
  "metal alkaliczny (litowiec)": "#FAC7C2",
  "metal ziem alkalicznych (berylowiec)": "#F6E6AE",
  "półmetal": "#BDE4D5",
  "fluorowiec (halogen)": "#BFE5EF",
  "metal bloku d": "#F1CCD8",
  "metal grupy 12": "#F1CCD8",
  "metal bloku p": "#D1DEEA",
  "metal bloku p (klasyfikacja sporna)": "#D1DEEA",
  "lantanowiec": "#DECEF1",
  "aktynowiec": "#E9C9EC",
};

/** Keeps both fields in place, masking the answer until the introduction reveals it. */
export function PeriodicElementPrompt({ text, scale = 1, children }: {
  text: string;
  scale?: number;
  children: ReactNode;
}) {
  const { element, revealAnswer } = useContext(PeriodicElementContext);
  if (!element || (text !== element.symbol && text !== element.name)) return <>{children}</>;

  const showSymbol = revealAnswer || text === element.symbol;
  const showName = revealAnswer || text === element.name;
  const size = 112 * scale;
  return (
    <View style={styles.container}>
      <View style={[
        styles.tile,
        { width: size, minHeight: size, padding: 10 * scale, backgroundColor: familyColors[element.family] ?? "#D1DEEA" },
      ]}>
        <Text style={[styles.number, { fontSize: 14 * scale, lineHeight: 18 * scale }]}>{element.atomicNumber}</Text>
        <Text style={[styles.symbol, { fontSize: 42 * scale, lineHeight: 48 * scale }]}>{showSymbol ? element.symbol : "?"}</Text>
        <Text
          style={[styles.name, { fontSize: 16 * scale, lineHeight: 21 * scale }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
        >{showName ? element.name : "?"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", minWidth: 0 },
  tile: { maxWidth: "100%", borderWidth: 1.5, borderColor: "#7B6B58", borderRadius: 5, justifyContent: "space-between", alignItems: "center" },
  number: { alignSelf: "flex-start", color: "#6E4932", fontWeight: "600" },
  symbol: { color: "#302A24", fontWeight: "700", textAlign: "center" },
  name: { color: "#302A24", fontWeight: "500", textAlign: "center", alignSelf: "stretch" },
});
