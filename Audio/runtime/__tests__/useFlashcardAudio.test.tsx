import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Alert, AppState, type AppStateStatus } from "react-native";
import { getCustomCourseById } from "@/src/db/sqlite/repositories/courses";
import { flashcardAudioPlayer } from "../playback";
import type { FlashcardAutoplayMode } from "@/src/contexts/settings/types";
import { useFlashcardAudio } from "../useFlashcardAudio";

jest.mock("@/src/db/sqlite/repositories/courses", () => ({ getCustomCourseById: jest.fn() }));
jest.mock("../playback", () => ({ flashcardAudioPlayer: { play: jest.fn(async () => {}), stop: jest.fn(async () => {}) } }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT }) }));
const mockT = (key: string) => key;
const mockPopup = jest.fn();
let mockHydrated = true;
let mockVolume = 1;
let mockVolumeHydrated = true;
let mockNativeLanguage = "pl";
let mockNativeHydrated = true;
let mockAudioSettings: { enabled: boolean; frontLanguage: string; backLanguage: string; autoplayMode?: FlashcardAutoplayMode } = { enabled: true, frontLanguage: "en-US", backLanguage: "pl-PL" };
const mockGetAudioSettings = jest.fn((_id: number) => mockAudioSettings);
jest.mock("@/src/contexts/SettingsContext", () => ({ useSettings: () => ({
  nativeLanguage: mockNativeLanguage,
  nativeLanguageHydrated: mockNativeHydrated,
  courseAudioSettingsHydrated: mockHydrated,
  flashcardAudioVolume: mockVolume,
  flashcardAudioVolumeHydrated: mockVolumeHydrated,
  getCustomCourseAudioSettings: mockGetAudioSettings,
}) }));
jest.mock("@/src/contexts/PopupContext", () => ({ usePopup: () => mockPopup }));
const getCourse = jest.mocked(getCustomCourseById);
beforeEach(() => {
  jest.clearAllMocks();
  AppState.currentState = "active";
  mockNativeLanguage = "pl";
  mockNativeHydrated = true;
  mockHydrated = true;
  mockVolume = 1;
  mockVolumeHydrated = true;
  mockGetAudioSettings.mockImplementation(() => mockAudioSettings);
  mockAudioSettings = { enabled: true, frontLanguage: "en-US", backLanguage: "pl-PL", autoplayMode: "all" };
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
it("uses the current course and physical side for study/box0/review read requests", async () => {
  getCourse.mockResolvedValue({ slug: "es_to_pl_first_50" } as never);
  const screen = renderHook(() => useFlashcardAudio(42, "0001", "card/box0", true));
  await waitFor(() => expect(screen.result.current.available).toBe(true));
  act(() => screen.result.current.read("front", "agua"));
  expect(flashcardAudioPlayer.play).toHaveBeenLastCalledWith(expect.objectContaining({ language: "es-ES",
    recording: expect.objectContaining({ packName: "audio_es" }), text: "agua" }));
  act(() => screen.result.current.read("back", "woda"));
  expect(flashcardAudioPlayer.play).toHaveBeenLastCalledWith(expect.objectContaining({ language: "pl-PL", recording: null }));
  act(() => screen.result.current.read("front", "changed"));
  expect(flashcardAudioPlayer.play).toHaveBeenLastCalledWith(expect.objectContaining({ language: "es-ES", recording: null }));
});
it("stops on card change, loss of focus, background and unmount; autofocus never reads", async () => {
  let appState!: (state: AppStateStatus) => void;
  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => {
    appState = listener; return { remove: jest.fn() };
  });
  getCourse.mockResolvedValue({ slug: "es_to_en_first_50" } as never);
  const screen = renderHook<ReturnType<typeof useFlashcardAudio>, { key: string; enabled: boolean }>(({ key, enabled }) => useFlashcardAudio(42, "0001", key, enabled), {
    initialProps: { key: "first", enabled: true },
  });
  await waitFor(() => expect(screen.result.current.available).toBe(true));
  expect(flashcardAudioPlayer.play).not.toHaveBeenCalled();
  screen.rerender({ key: "second", enabled: true });
  screen.rerender({ key: "second", enabled: false });
  const calls = jest.mocked(flashcardAudioPlayer.stop).mock.calls.length;
  act(() => appState("background"));
  expect(flashcardAudioPlayer.stop).toHaveBeenCalledTimes(calls + 1);
  act(() => screen.result.current.read("front", "agua"));
  expect(flashcardAudioPlayer.play).not.toHaveBeenCalled();
  screen.unmount();
  expect(flashcardAudioPlayer.stop).toHaveBeenCalledTimes(calls + 2);
  jest.restoreAllMocks();
});


describe("autoplay lifecycle", () => {
  type Props = { context: string; ready: boolean; side: "front" | "back"; text: string; card: string; course: number; phase?: "question" | "answer"; delayMs?: number };
  const defaults: Props = { context: "question", ready: true, side: "front", text: "agua", card: "1", course: 42 };
  let appState: (state: AppStateStatus) => void;
  beforeEach(() => {
    jest.useFakeTimers();
    getCourse.mockResolvedValue({ slug: "es_to_pl_first_50", isOfficial: true } as never);
    jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => {
      appState = listener;
      return { remove: jest.fn() };
    });
  });
  async function mount(overrides: Partial<Props> = {}) {
    const hook = renderHook<ReturnType<typeof useFlashcardAudio>, Props>((props) => useFlashcardAudio(
      props.course, "0001", props.context, props.ready,
      { side: props.side, text: props.text, cardKey: props.card, phase: props.phase, delayMs: props.delayMs },
    ), { initialProps: { ...defaults, ...overrides } });
    await act(async () => {});
    return hook;
  }
  const advance = async (ms: number) => { await act(async () => { await jest.advanceTimersByTimeAsync(ms); }); };

  it("waits 500 ms and ordinary rerenders do not reset or repeat the timer", async () => {
    const hook = await mount();
    await advance(499);
    expect(flashcardAudioPlayer.play).not.toHaveBeenCalled();
    hook.rerender({ ...defaults });
    await advance(1);
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(1);
    hook.rerender({ ...defaults });
    await advance(1000);
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(1);
  });
  it("reads an answer immediately, cancels the question and does not repeat on correction or explanation", async () => {
    const hook = await mount();
    await advance(200);
    const answer: Props = { ...defaults, phase: "answer", delayMs: 0, side: "back", text: "woda", context: "answer" };
    hook.rerender(answer);
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(1);
    expect(flashcardAudioPlayer.play).toHaveBeenLastCalledWith(expect.objectContaining({ text: "woda", language: "pl-PL" }));
    hook.rerender({ ...answer, context: "correction" });
    hook.rerender({ ...answer, context: "explanation" });
    await advance(1000);
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(1);
  });
  it("reads the answer even when its text and side equal the question", async () => {
    const hook = await mount();
    await advance(500);
    hook.rerender({ ...defaults, phase: "answer", delayMs: 0 });
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(2);
  });
  it.each([
    ["es_to_en_first_50", "pl", "agua", "water", "es-ES"],
    ["es_to_en_first_50", "en", "agua", "water", "es-ES"],
    ["fr_to_en_first_50", "en", "eau", "water", "fr-FR"],
    ["es_to_pl_first_50", "pl", "agua", "woda", "es-ES"],
    ["eng_to_pl_first_50", "pl", "water", "woda", "en-US"],
  ])("reads the learned side after a checked translation in %s (native %s)", async (slug, native, front, back, language) => {
    getCourse.mockResolvedValue({ slug, isOfficial: true } as never);
    mockNativeLanguage = native;
    mockAudioSettings.autoplayMode = "non_native";
    const props = { ...defaults, cardKey: "1", context: "answer", side: "back" as const, text: back,
      phase: "answer" as const, delayMs: 0, opposite: { side: "front" as const, text: front } };
    const hook = renderHook(() => useFlashcardAudio(42, "0001", props.context, true, props));
    await act(async () => {});
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(1);
    expect(flashcardAudioPlayer.play).toHaveBeenLastCalledWith(expect.objectContaining({ text: front, language }));
    hook.rerender({});
    await advance(1000);
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(1);
  });
  it.each(["all", "off"] as const)("preserves explicit %s mode for checked translations", async (mode) => {
    getCourse.mockResolvedValue({ slug: "es_to_en_first_50", isOfficial: true } as never);
    mockNativeLanguage = "en";
    mockAudioSettings.autoplayMode = mode;
    renderHook(() => useFlashcardAudio(42, "0001", "answer", true, {
      side: "back", text: "water", cardKey: "1", phase: "answer", delayMs: 0,
      opposite: { side: "front", text: "agua" },
    }));
    await act(async () => {});
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(mode === "off" ? 0 : 1);
    if (mode === "all") expect(flashcardAudioPlayer.play).toHaveBeenLastCalledWith(
      expect.objectContaining({ text: "water", language: "en-US" }),
    );
  });
  it("chooses the non-native side of a custom course even when it is the back", async () => {
    getCourse.mockResolvedValue({ slug: null, isOfficial: false } as never);
    mockNativeLanguage = "en";
    mockAudioSettings = { enabled: true, frontLanguage: "en-US", backLanguage: "es-ES", autoplayMode: "non_native" };
    renderHook(() => useFlashcardAudio(42, "0001", "answer", true, {
      side: "front", text: "water", cardKey: "1", phase: "answer", delayMs: 0,
      opposite: { side: "back", text: "agua" },
    }));
    await act(async () => {});
    expect(flashcardAudioPlayer.play).toHaveBeenLastCalledWith(expect.objectContaining({ text: "agua", language: "es-ES" }));
  });
  it.each(["disabled", "muted", "unfocused"])("suppresses immediate answers when %s", async (reason) => {
    if (reason === "disabled") mockAudioSettings.enabled = false;
    if (reason === "muted") mockVolume = 0;
    const hook = await mount({ phase: "answer", delayMs: 0, ready: reason !== "unfocused" });
    await advance(1000);
    expect(hook.result.current.available).toBe(false);
    expect(flashcardAudioPlayer.play).not.toHaveBeenCalled();
  });
  it("a tap plays immediately and cancels pending autoplay", async () => {
    const hook = await mount();
    await advance(200);
    act(() => hook.result.current.read("front", "agua"));
    await advance(500);
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(1);
    act(() => hook.result.current.read("front", "agua"));
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(2);
  });
  it("drops the old card timer and reads the new physical side", async () => {
    const hook = await mount();
    await advance(400);
    hook.rerender({ ...defaults, card: "2", side: "back", text: "woda", context: "next" });
    await advance(499);
    expect(flashcardAudioPlayer.play).not.toHaveBeenCalled();
    await advance(1);
    expect(flashcardAudioPlayer.play).toHaveBeenLastCalledWith(expect.objectContaining({ text: "woda", language: "pl-PL" }));
  });
  it("does not repeat an unchanged prompt in correction but reads a new visible variant", async () => {
    const hook = await mount();
    await advance(500);
    hook.rerender({ ...defaults, context: "correction" });
    await advance(500);
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(1);
    hook.rerender({ ...defaults, context: "variant", text: "libro" });
    await advance(500);
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(2);
  });
  it.each(["focus", "switch", "unmount", "background"])("cancels playback and pending timers on %s", async (reason) => {
    const hook = await mount();
    await advance(200);
    const stops = jest.mocked(flashcardAudioPlayer.stop).mock.calls.length;
    if (reason === "focus") hook.rerender({ ...defaults, ready: false });
    if (reason === "switch") {
      mockAudioSettings.enabled = false;
      hook.rerender({ ...defaults });
    }
    if (reason === "unmount") hook.unmount();
    if (reason === "background") act(() => appState("background"));
    await advance(1000);
    expect(flashcardAudioPlayer.play).not.toHaveBeenCalled();
    expect(jest.mocked(flashcardAudioPlayer.stop).mock.calls.length).toBeGreaterThan(stops);
    if (reason === "background") {
      act(() => appState("active"));
      await advance(1000);
      expect(flashcardAudioPlayer.play).not.toHaveBeenCalled();
    }
  });
  it("waits for global volume hydration and suppresses both gestures and autoplay at zero", async () => {
    mockVolumeHydrated = false;
    const hook = await mount();
    await advance(500);
    expect(hook.result.current.available).toBe(false);
    mockVolumeHydrated = true;
    mockVolume = 0;
    hook.rerender({ ...defaults });
    act(() => hook.result.current.read("front", "agua"));
    await advance(500);
    expect(flashcardAudioPlayer.play).not.toHaveBeenCalled();
    mockVolume = 0.5;
    hook.rerender({ ...defaults });
    await advance(500);
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(1);
  });
  it("waits for settings hydration and stable content", async () => {
    mockHydrated = false;
    const hook = await mount({ ready: false });
    await advance(1000);
    mockHydrated = true;
    hook.rerender({ ...defaults, ready: false });
    await advance(1000);
    expect(flashcardAudioPlayer.play).not.toHaveBeenCalled();
    hook.rerender({ ...defaults });
    await advance(500);
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(1);
  });
  it("waits for course metadata, ignores stale course lookup", async () => {
    let complete!: (record: never) => void;
    getCourse.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
    const hook = await mount();
    await advance(1000);
    expect(flashcardAudioPlayer.play).not.toHaveBeenCalled();
    getCourse.mockResolvedValue({ slug: "fr_to_pl_first_50", isOfficial: true } as never);
    hook.rerender({ ...defaults, course: 43, text: "bonjour" });
    await act(async () => { complete({ slug: "es_to_pl_first_50" } as never); });
    await advance(500);
    expect(flashcardAudioPlayer.play).toHaveBeenLastCalledWith(expect.objectContaining({ language: "fr-FR", text: "bonjour" }));
  });
  it("allows TTS for an official course outside the MP3 catalog", async () => {
    getCourse.mockResolvedValue({ slug: "eng_to_pl_first_50", isOfficial: true } as never);
    await mount({ text: "hello" });
    await advance(500);
    expect(flashcardAudioPlayer.play).toHaveBeenLastCalledWith(expect.objectContaining({ language: "en-US", recording: null }));
  });
  it("requires both languages for custom courses and uses their physical sides", async () => {
    getCourse.mockResolvedValue({ slug: null, isOfficial: false } as never);
    mockAudioSettings = { enabled: true, frontLanguage: "", backLanguage: "pl-PL", autoplayMode: "all" };
    const hook = await mount({ text: "hello" });
    await advance(500);
    expect(hook.result.current.available).toBe(false);
    mockAudioSettings.frontLanguage = "en-US";
    hook.rerender({ ...defaults, text: "hello" });
    await advance(500);
    expect(flashcardAudioPlayer.play).toHaveBeenLastCalledWith(expect.objectContaining({ language: "en-US", recording: null }));
    act(() => hook.result.current.read("back", "cześć"));
    expect(flashcardAudioPlayer.play).toHaveBeenLastCalledWith(expect.objectContaining({ language: "pl-PL", recording: null }));
  });
  it("uses the reviewed course settings rather than a different active course", async () => {
    mockGetAudioSettings.mockImplementation((id) => ({ ...mockAudioSettings, enabled: id === 43 }));
    const hook = await mount();
    await advance(500);
    expect(flashcardAudioPlayer.play).not.toHaveBeenCalled();
    hook.rerender({ ...defaults, course: 43 });
    await act(async () => {});
    await advance(500);
    expect(mockGetAudioSettings).toHaveBeenCalledWith(43);
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(1);
  });
  it("ignores empty text and makes auto errors nonblocking once per session", async () => {
    const alert = jest.spyOn(Alert, "alert");
    const hook = await mount({ text: "" });
    await advance(1000);
    expect(flashcardAudioPlayer.play).not.toHaveBeenCalled();
    hook.rerender({ ...defaults });
    await advance(500);
    const error = jest.mocked(flashcardAudioPlayer.play).mock.calls.at(-1)![0].onError;
    act(() => { error(); error(); });
    expect(mockPopup).toHaveBeenCalledTimes(1);
    expect(alert).not.toHaveBeenCalled();
    act(() => hook.result.current.read("front", "agua"));
    act(() => jest.mocked(flashcardAudioPlayer.play).mock.calls.at(-1)![0].onError());
    expect(alert).toHaveBeenCalledTimes(1);
  });
  it.each([
    ["pl", "front", 1], ["pl", "back", 0],
    ["en", "front", 0], ["en", "back", 1],
  ] as const)("skips only native language %s on physical side %s", async (native, side, count) => {
    getCourse.mockResolvedValue({ slug: null, isOfficial: false } as never);
    mockAudioSettings.autoplayMode = "non_native";
    mockNativeLanguage = native;
    const hook = await mount({ side, text: side === "front" ? "cat" : "kot" });
    await advance(500);
    expect(hook.result.current.available).toBe(true);
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(count);
    hook.rerender({ ...defaults, side, text: "answer", phase: "answer", delayMs: 0 });
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(count * 2);
  });

  it.each([
    ["all", 1], ["off", 0], ["non_native", 0], [undefined, 0],
  ] as const)("uses course mode %s for native text", async (mode, count) => {
    mockAudioSettings.autoplayMode = mode;
    await mount({ side: "back", text: "woda" });
    await advance(500);
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(count);
  });

  it.each(["non_native", "off"] as const)("allows manual native audio when autoplay is %s", async (mode) => {
    mockAudioSettings.autoplayMode = mode;
    const hook = await mount({ side: "back", text: "woda" });
    await advance(500);
    expect(flashcardAudioPlayer.play).not.toHaveBeenCalled();
    act(() => hook.result.current.read("back", "woda"));
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(1);
    expect(flashcardAudioPlayer.play).toHaveBeenLastCalledWith(expect.objectContaining({ language: "pl-PL" }));
    await advance(1000);
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(1);
  });

  it("waits for native language hydration before immediate answers", async () => {
    mockNativeHydrated = false;
    const props = { ...defaults, phase: "answer" as const, delayMs: 0 };
    const hook = await mount(props);
    expect(hook.result.current.available).toBe(true);
    await advance(1000);
    expect(flashcardAudioPlayer.play).not.toHaveBeenCalled();
    mockNativeHydrated = true;
    hook.rerender(props);
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(1);
    hook.rerender(props);
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(1);
  });

  it.each(["native", "course"])("cancels native prompt timer after changing %s", async (preference) => {
    const props = { ...defaults, side: "back" as const, text: "woda" };
    if (preference === "native") { mockAudioSettings.autoplayMode = "non_native"; mockNativeLanguage = "en"; }
    const hook = await mount(props);
    await advance(200);
    if (preference === "native") mockNativeLanguage = "pl";
    if (preference === "course") mockAudioSettings.autoplayMode = "off";
    hook.rerender(props);
    await advance(1000);
    expect(flashcardAudioPlayer.play).not.toHaveBeenCalled();
  });

  it("stops automatic native audio excluded by a new rule without replaying it", async () => {
    const props = { ...defaults, side: "back" as const, text: "woda", phase: "answer" as const, delayMs: 0 };
    const hook = await mount(props);
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(1);
    const stops = jest.mocked(flashcardAudioPlayer.stop).mock.calls.length;
    mockAudioSettings.autoplayMode = "non_native";
    hook.rerender(props);
    expect(flashcardAudioPlayer.stop).toHaveBeenCalledTimes(stops + 1);
    mockAudioSettings.autoplayMode = "all";
    hook.rerender(props);
    await advance(500);
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(1);
  });

  it("does not stop manually requested native audio when automatic playback changes", async () => {
    mockAudioSettings.autoplayMode = "off";
    const hook = await mount();
    act(() => hook.result.current.read("back", "woda"));
    const stops = jest.mocked(flashcardAudioPlayer.stop).mock.calls.length;
    mockAudioSettings.autoplayMode = "non_native";
    hook.rerender({ ...defaults });
    expect(flashcardAudioPlayer.stop).toHaveBeenCalledTimes(stops);
    await advance(1000);
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(1);
  });

  it.each([ ["es-ES", "fr-FR", 2], ["pl-PL", "pl-PL", 0] ] as const)("handles two configured languages %s and %s", async (front, back, count) => {
    getCourse.mockResolvedValue({ slug: null, isOfficial: false } as never);
    mockAudioSettings.frontLanguage = front;
    mockAudioSettings.backLanguage = back;
    mockAudioSettings.autoplayMode = "non_native";
    const hook = await mount();
    await advance(500);
    hook.rerender({ ...defaults, side: "back", text: "answer", phase: "answer", delayMs: 0 });
    expect(flashcardAudioPlayer.play).toHaveBeenCalledTimes(count);
  });

});
