import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { flashcardAudioPlayer } from "@/Audio/runtime/playback";
import { setFeedbackVolume } from "@/src/utils/soundPlayer";
import { useAudioFeedbackSettings } from "../useAudioFeedbackSettings";

jest.mock("@/Audio/runtime/playback", () => ({ flashcardAudioPlayer: { setVolume: jest.fn() } }));
jest.mock("@/src/utils/soundPlayer", () => ({ setFeedbackVolume: jest.fn() }));
beforeEach(async () => { await AsyncStorage.clear(); jest.clearAllMocks(); });

it("preserves the old effects preference and defaults flashcard audio to 100%", async () => {
  await AsyncStorage.setItem("feedbackVolume", "0.37");
  const hook = renderHook(() => useAudioFeedbackSettings());
  await waitFor(() => expect(hook.result.current.flashcardAudioVolumeHydrated).toBe(true));
  expect(hook.result.current.feedbackVolume).toBe(0.37);
  expect(hook.result.current.flashcardAudioVolume).toBe(1);
  expect(setFeedbackVolume).toHaveBeenLastCalledWith(0.37);
  expect(flashcardAudioPlayer.setVolume).toHaveBeenLastCalledWith(1);
});
it("persists independent volumes, including mute, and restores them after remount", async () => {
  const hook = renderHook(() => useAudioFeedbackSettings());
  await waitFor(() => expect(hook.result.current.flashcardAudioVolumeHydrated).toBe(true));
  await act(async () => { await hook.result.current.setFlashcardAudioVolume(0); });
  expect(hook.result.current.feedbackVolume).toBe(0.5);
  await act(async () => { await hook.result.current.setFeedbackVolume(0.2); });
  expect(hook.result.current.flashcardAudioVolume).toBe(0);
  hook.unmount();
  const restored = renderHook(() => useAudioFeedbackSettings());
  await waitFor(() => expect(restored.result.current.flashcardAudioVolumeHydrated).toBe(true));
  expect(restored.result.current.flashcardAudioVolume).toBe(0);
  expect(restored.result.current.feedbackVolume).toBe(0.2);
  expect(flashcardAudioPlayer.setVolume).toHaveBeenLastCalledWith(0);
});
it("clamps the new preference and restores both defaults on settings reset", async () => {
  const hook = renderHook(() => useAudioFeedbackSettings());
  await waitFor(() => expect(hook.result.current.flashcardAudioVolumeHydrated).toBe(true));
  await act(async () => { await hook.result.current.setFlashcardAudioVolume(2); });
  expect(hook.result.current.flashcardAudioVolume).toBe(1);
  await act(async () => { await hook.result.current.setFlashcardAudioVolume(-1); });
  expect(hook.result.current.flashcardAudioVolume).toBe(0);
  await act(async () => { await hook.result.current.resetAudioFeedbackSettings(); });
  expect(hook.result.current.flashcardAudioVolume).toBe(1);
  expect(hook.result.current.feedbackVolume).toBe(0.5);
});
