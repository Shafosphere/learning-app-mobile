import { act, renderHook } from "@testing-library/react-native";
import { useStartupLoadingMessage } from "../useStartupLoadingMessage";
import type { DbInitializationEvent } from "@/src/db/sqlite/core";

describe("startup loading messages", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("keeps the existing messages without a content update", () => {
    const { result } = renderHook(useStartupLoadingMessage);
    expect(result.current.loadingMessageKey).toBe("app.loading.initializing");
    act(() => result.current.handleStartupMessageEvent({ type: "import-start" }));
    expect(result.current.loadingMessageKey).toBe("app.loading.importingCsv");
    act(() => result.current.handleStartupMessageEvent({ type: "import-finish" }));
    act(() => jest.advanceTimersByTime(4000));
    expect(result.current.loadingMessageKey).toBe("app.loading.finishingSetup");
    expect(jest.getTimerCount()).toBe(0);
  });

  it("rotates every two seconds without restarting on another update or progress", () => {
    const { result } = renderHook(useStartupLoadingMessage);
    act(() => result.current.handleStartupMessageEvent({ type: "content-update-detected" }));
    expect(result.current.loadingMessageKey).toBe("app.loading.newVersion");
    act(() => jest.advanceTimersByTime(1999));
    expect(result.current.loadingMessageKey).toBe("app.loading.newVersion");
    act(() => {
      result.current.handleStartupMessageEvent({ type: "content-update-detected" });
      result.current.handleStartupMessageEvent({ type: "progress", completed: 1, total: 2, percent: 50 });
      jest.advanceTimersByTime(1);
    });
    expect(result.current.loadingMessageKey).toBe("app.loading.updatingFlashcards");
    act(() => jest.advanceTimersByTime(2000));
    expect(result.current.loadingMessageKey).toBe("app.loading.newVersion");
    expect(jest.getTimerCount()).toBe(1);
  });

  it.each<{ event: DbInitializationEvent; message: string }>([
    { event: { type: "ready", initialImport: false }, message: "app.loading.launching" },
    { event: { type: "error", error: new Error("Failed") }, message: "app.loading.dbError" },
    { event: { type: "start" }, message: "app.loading.initializing" },
  ])("stops immediately on $event.type", ({ event, message }) => {
    const { result } = renderHook(useStartupLoadingMessage);
    act(() => result.current.handleStartupMessageEvent({ type: "content-update-detected" }));
    act(() => jest.advanceTimersByTime(500));
    act(() => result.current.handleStartupMessageEvent(event));
    expect(result.current.loadingMessageKey).toBe(message);
    expect(jest.getTimerCount()).toBe(0);
    act(() => jest.advanceTimersByTime(4000));
    expect(result.current.loadingMessageKey).toBe(message);
  });

  it("clears the timer when preparing a retry and starts a fresh rotation", () => {
    const { result } = renderHook(useStartupLoadingMessage);
    act(() => result.current.handleStartupMessageEvent({ type: "content-update-detected" }));
    act(() => jest.advanceTimersByTime(2000));
    act(() => result.current.resetStartupMessage());
    expect(result.current.loadingMessageKey).toBe("app.loading.initializing");
    expect(jest.getTimerCount()).toBe(0);
    act(() => result.current.handleStartupMessageEvent({ type: "content-update-detected" }));
    expect(result.current.loadingMessageKey).toBe("app.loading.newVersion");
    expect(jest.getTimerCount()).toBe(1);
  });

  it("clears the timer when leaving loading outside DB events", () => {
    const { result } = renderHook(useStartupLoadingMessage);
    act(() => result.current.handleStartupMessageEvent({ type: "content-update-detected" }));
    act(() => result.current.stopStartupMessageRotation());
    expect(jest.getTimerCount()).toBe(0);
  });

  it("clears the timer on unmount", () => {
    const { result, unmount } = renderHook(useStartupLoadingMessage);
    act(() => result.current.handleStartupMessageEvent({ type: "content-update-detected" }));
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
