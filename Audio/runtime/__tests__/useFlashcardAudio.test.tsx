import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { getCustomCourseById } from "@/src/db/sqlite/repositories/courses";
import { flashcardAudioPlayer } from "../playback";
import { useFlashcardAudio } from "../useFlashcardAudio";

jest.mock("@/src/db/sqlite/repositories/courses", () => ({ getCustomCourseById: jest.fn() }));
jest.mock("../playback", () => ({ flashcardAudioPlayer: { play: jest.fn(async () => {}), stop: jest.fn(async () => {}) } }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const getCourse = jest.mocked(getCustomCourseById);
beforeEach(() => { jest.clearAllMocks(); });
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
