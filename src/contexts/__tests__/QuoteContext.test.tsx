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

describe("quote occurrence identity", () => {
  beforeEach(() => {
    (useSettings as jest.Mock).mockReturnValue({ quotesEnabled: true });
  });

  it("increments for repeated accepted occurrences of the same text", () => {
    const { result } = renderQuotes();
    expect(result.current.quoteEventId).toBe(0);
    act(() => result.current.showQuote("general"));
    const quoteId = result.current.quote?.id;
    expect(result.current.quoteEventId).toBe(1);
    act(() => result.current.showQuote("general"));
    expect(result.current.quote?.id).toBe(quoteId);
    expect(result.current.quoteEventId).toBe(2);
    act(() => result.current.hideQuote());
    expect(result.current.quoteEventId).toBe(2);
    act(() => result.current.showQuote("general"));
    expect(result.current.quoteEventId).toBe(3);
  });

  it("increments for each batched accepted show", () => {
    const { result } = renderQuotes();
    act(() => {
      result.current.showQuote("general");
      result.current.showQuote("general");
    });
    expect(result.current.quoteEventId).toBe(2);
  });

  it("does not consume occurrence IDs for disabled or suppressed requests", () => {
    const { result, rerender } = renderQuotes();
    rerender({ compact: true, secondScreen: false });
    act(() => result.current.showQuote("general"));
    expect(result.current.quoteEventId).toBe(0);
    rerender({ compact: false, secondScreen: false });
    (useSettings as jest.Mock).mockReturnValue({ quotesEnabled: false });
    rerender({ compact: false, secondScreen: false });
    act(() => result.current.showQuote("general"));
    expect(result.current.quoteEventId).toBe(0);
  });

  it("does not consume occurrence IDs for cooldown or probability rejection", () => {
    const { result } = renderQuotes();
    const request = { trigger: "repeat", category: "general" as const, respectGlobalCooldown: false, cooldownMs: 60000 };
    act(() => result.current.triggerQuote(request));
    expect(result.current.quoteEventId).toBe(1);
    act(() => result.current.triggerQuote(request));
    expect(result.current.quoteEventId).toBe(1);
    const random = jest.spyOn(Math, "random").mockReturnValue(0.9);
    act(() => result.current.triggerQuote({ ...request, trigger: "probability", probability: 0.1 }));
    expect(result.current.quoteEventId).toBe(1);
    random.mockRestore();
  });
});
