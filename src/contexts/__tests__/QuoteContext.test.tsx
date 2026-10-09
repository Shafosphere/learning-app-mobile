import { act, renderHook } from "@testing-library/react-native";
import React from "react";

import { QuoteProvider, useQuote } from "../QuoteContext";
import { useQuoteSuppression } from "../QuoteSuppressionContext";
import { useSettings } from "../SettingsContext";

jest.mock("../SettingsContext", () => ({ useSettings: jest.fn() }));
jest.mock("react-i18next", () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

const wrapper = ({ children }: React.PropsWithChildren) => (
  <QuoteProvider>{children}</QuoteProvider>
);

function renderQuotes() {
  return renderHook(({ compact, secondScreen }: { compact: boolean; secondScreen: boolean }) => {
    useQuoteSuppression(compact);
    useQuoteSuppression(secondScreen);
    return useQuote();
  }, { wrapper, initialProps: { compact: false, secondScreen: false } });
}

describe("quote suppression", () => {
  beforeEach(() => {
    (useSettings as jest.Mock).mockReturnValue({ quotesEnabled: true });
  });

  it("dismisses a visible reaction on compact layout and does not replay it on recovery", () => {
    const { result, rerender } = renderQuotes();
    act(() => result.current.showQuote("win_standard"));
    expect(result.current.isVisible).toBe(true);

    rerender({ compact: true, secondScreen: false });
    expect(result.current.isVisible).toBe(false);
    act(() => result.current.showQuote("box_spam"));
    expect(result.current.isVisible).toBe(false);

    rerender({ compact: false, secondScreen: false });
    expect(result.current.isVisible).toBe(false);
    act(() => result.current.showQuote("win_standard"));
    expect(result.current.isVisible).toBe(true);
  });

  it("skips reactions before consuming their trigger or global cooldown", () => {
    const { result, rerender } = renderQuotes();
    const request = { trigger: "answer", category: "win_standard" as const };
    rerender({ compact: true, secondScreen: false });
    act(() => result.current.triggerQuote(request));
    expect(result.current.quote).toBeNull();

    rerender({ compact: false, secondScreen: false });
    act(() => result.current.triggerQuote(request));
    expect(result.current.isVisible).toBe(true);
  });

  it("keeps reactions suppressed until every screen releases its registration", () => {
    const { result, rerender } = renderQuotes();
    rerender({ compact: true, secondScreen: true });
    rerender({ compact: false, secondScreen: true });
    act(() => result.current.showQuote("general"));
    expect(result.current.isVisible).toBe(false);

    rerender({ compact: false, secondScreen: false });
    act(() => result.current.showQuote("general"));
    expect(result.current.isVisible).toBe(true);
  });

  it("respects disabled quotes after layout suppression ends", () => {
    const { result, rerender } = renderQuotes();
    rerender({ compact: true, secondScreen: false });
    (useSettings as jest.Mock).mockReturnValue({ quotesEnabled: false });
    rerender({ compact: false, secondScreen: false });
    act(() => {
      result.current.showQuote("general");
      result.current.triggerQuote({ trigger: "answer", category: "win_standard" });
    });
    expect(result.current.isVisible).toBe(false);
  });
});
