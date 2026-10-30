import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useLearningPreferencesSettings } from "../useLearningPreferencesSettings";

const conversionKey = "flashcards.autoConvertSpanishPunctuation";
const toleranceKey = "flashcards.ignoreBoundaryPunctuation";

describe("punctuation settings persistence", () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it("defaults to enabled, persists independent choices and resets them", async () => {
    const first = renderHook(useLearningPreferencesSettings);
    await act(async () => {});
    expect(first.result.current.autoConvertSpanishPunctuation).toBe(true);
    expect(first.result.current.ignoreBoundaryPunctuation).toBe(true);
    await act(async () => { await first.result.current.toggleAutoConvertSpanishPunctuation(); });
    expect(first.result.current.ignoreBoundaryPunctuation).toBe(true);
    await act(async () => { await first.result.current.toggleIgnoreBoundaryPunctuation(); });
    expect(await AsyncStorage.getItem(conversionKey)).toBe("false");
    expect(await AsyncStorage.getItem(toleranceKey)).toBe("false");
    first.unmount();
    const second = renderHook(useLearningPreferencesSettings);
    await waitFor(() => {
      expect(second.result.current.autoConvertSpanishPunctuation).toBe(false);
      expect(second.result.current.ignoreBoundaryPunctuation).toBe(false);
    });
    await act(async () => { await second.result.current.resetLearningPreferencesSettings(); });
    expect(second.result.current.autoConvertSpanishPunctuation).toBe(true);
    expect(second.result.current.ignoreBoundaryPunctuation).toBe(true);
    expect(await AsyncStorage.getItem(conversionKey)).toBe("true");
    expect(await AsyncStorage.getItem(toleranceKey)).toBe("true");
  });
});
