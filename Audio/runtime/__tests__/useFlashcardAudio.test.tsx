import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Alert, AppState, type AppStateStatus } from "react-native";
import { getCustomCourseById } from "@/src/db/sqlite/repositories/courses";
import { flashcardAudioPlayer } from "../playback";
import { useFlashcardAudio } from "../useFlashcardAudio";

jest.mock("@/src/db/sqlite/repositories/courses", () => ({ getCustomCourseById: jest.fn() }));
jest.mock("../playback", () => ({ flashcardAudioPlayer: { play: jest.fn(async () => {}), stop: jest.fn(async () => {}) } }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT }) }));
const mockT = (key: string) => key;
const mockPopup = jest.fn();
let mockHydrated = true;
let mockVolume = 1;
let mockVolumeHydrated = true;
let mockAudioSettings = { enabled: true, frontLanguage: "en-US", backLanguage: "pl-PL" };
const mockGetAudioSettings = jest.fn((_id: number) => mockAudioSettings);
jest.mock("@/src/contexts/SettingsContext", () => ({ useSettings: () => ({
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
  mockHydrated = true;
  mockVolume = 1;
  mockVolumeHydrated = true;
  mockGetAudioSettings.mockImplementation(() => mockAudioSettings);
  mockAudioSettings = { enabled: true, frontLanguage: "en-US", backLanguage: "pl-PL" };
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
it("uses the current course and physical side for study/box0/review read requests", async () => {
  getCourse.mockResolvedValue({ slug: "es_to_pl_first_50" } as never);
  const screen = renderHook(() => useFlashcardAudio(42, "0001", "card/box0", true));
  await waitFor(() => expect(screen.result.current.available).toBe(true));
  act(() => screen.result.current.read("front", "agua"));
  expect(flashcardAudioPlayer.play).toHaveBeenLastCalledWith(expect.objectContaining({ language: "es-ES",
    recording: expect.objectContaining({ packName: "audio_es_50" }), text: "agua" }));
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
  type Props = { context: string; ready: boolean; side: "front" | "back"; text: string; card: string; course: number };
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
      { side: props.side, text: props.text, cardKey: props.card },
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
    mockAudioSettings = { enabled: true, frontLanguage: "", backLanguage: "pl-PL" };
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
});
