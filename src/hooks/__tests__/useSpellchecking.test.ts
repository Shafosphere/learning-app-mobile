import { renderHook } from "@testing-library/react-native";
import { useSettings } from "@/src/contexts/SettingsContext";
import useSpellchecking from "../useSpellchecking";

jest.mock("@/src/contexts/SettingsContext", () => ({ useSettings: jest.fn() }));
const settings = useSettings as jest.Mock;

describe("spellchecking punctuation tolerance", () => {
  beforeEach(() => settings.mockReturnValue({ spellChecking: false, ignoreDiacriticsInSpellcheck: false, ignoreBoundaryPunctuation: true }));

  it("accepts omitted marks even without typo tolerance", () => {
    const { result } = renderHook(useSpellchecking);
    expect(result.current("Cómo estás", "¿Cómo estás?")).toBe(true);
    expect(result.current("?Hola?", "¡Hola!")).toBe(true);
    expect(result.current("Holo", "¡Hola!")).toBe(false);
  });

  it("keeps one typo available after removing boundary marks", () => {
    settings.mockReturnValue({ ...settings(), spellChecking: true });
    const { result } = renderHook(useSpellchecking);
    expect(result.current("Holo", "¡Hola!")).toBe(true);
    expect(result.current("Hilo", "¡Hola!")).toBe(false);
    expect(result.current("?", "¿a?")).toBe(false);
  });

  it("preserves exact numeric matching and date punctuation", () => {
    settings.mockReturnValue({ ...settings(), spellChecking: true });
    const { result } = renderHook(useSpellchecking);
    expect(result.current("1994", "¿1994?")).toBe(true);
    expect(result.current("1995", "¿1994?")).toBe(false);
    expect(result.current("2025-01-01", "2025-01-01")).toBe(true);
    expect(result.current("2025/01/01", "2025-01-01")).toBe(false);
  });

  it("restores existing checking when tolerance is disabled", () => {
    settings.mockReturnValue({ ...settings(), ignoreBoundaryPunctuation: false });
    const { result } = renderHook(useSpellchecking);
    expect(result.current("Hola", "¡Hola!")).toBe(false);
    expect(result.current("¡Hola!", "¡Hola!")).toBe(true);
    expect(result.current("!", "!")).toBe(true);
  });
});
