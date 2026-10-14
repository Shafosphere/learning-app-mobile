import { createFlashcardAudioPlayer } from "../playback";
import type { Recording } from "../catalog";

jest.mock("@/Audio/modules/play-asset-delivery", () => ({ playAssetDelivery: null }));
type Dependencies = Parameters<typeof createFlashcardAudioPlayer>[0];
const record: Recording = { text: "agua", language: "es-ES", packName: "audio_es_core", relativePath: "agua.mp3" };
function setup() {
  const speak = jest.fn(), stop = jest.fn(async () => {});
  const voices = jest.fn(async () => [{ identifier: "es", language: "es-ES" }]);
  const remove = jest.fn(), play = jest.fn(), removeSubscription = jest.fn();
  let status: ((value: { isLoaded: boolean; didJustFinish: boolean; playbackState: string }) => void) | undefined;
  const audioPlayer = { volume: 1, remove, play, addListener: jest.fn((_name, listener) => {
    status = listener; return { remove: removeSubscription };
  }) };
  const create = jest.fn(() => audioPlayer);
  const uri = jest.fn(async () => "file:///agua.mp3" as string | null);
  const deps: Dependencies = {
    speech: () => ({ speak, stop, getAvailableVoicesAsync: voices, maxSpeechInputLength: 1000 }) as unknown as ReturnType<Dependencies["speech"]>,
    audio: () => ({ createAudioPlayer: create, setAudioModeAsync: jest.fn(async () => {}) }) as unknown as ReturnType<Dependencies["audio"]>,
    uri,
  };
  const player = createFlashcardAudioPlayer(deps);
  const onError = jest.fn();
  const request = { text: "agua", language: "es-ES", recording: record, onError };
  return { player, audioPlayer, request, speak, stop, voices, create, uri, remove, play, onError,
    status: (value: Parameters<NonNullable<typeof status>>[0]) => status?.(value) };
}
afterEach(() => { jest.useRealTimers(); });
it("plays a local MP3, and a repeated tap releases the previous player", async () => {
  const s = setup();
  await s.player.play(s.request);
  expect(s.create).toHaveBeenCalledWith({ uri: "file:///agua.mp3" });
  expect(s.speak).not.toHaveBeenCalled();
  await s.player.play(s.request);
  expect(s.remove).toHaveBeenCalledTimes(1);
  expect(s.play).toHaveBeenCalledTimes(2);
  await s.player.stop();
});
it("falls back to the matching device voice when MP3 is missing", async () => {
  const s = setup(); s.uri.mockResolvedValue(null);
  await s.player.play(s.request);
  expect(s.speak).toHaveBeenCalledWith("agua", expect.objectContaining({ language: "es-ES", voice: "es" }));
  expect(s.create).not.toHaveBeenCalled();
  await s.player.stop();
});
it("does not play a URI that resolves after stop/navigation", async () => {
  const s = setup(); let complete!: (value: string) => void;
  let started!: () => void;
  const uriStarted = new Promise<void>((resolve) => { started = resolve; });
  s.uri.mockImplementation(() => new Promise((resolve) => { complete = resolve; started(); }));
  const pending = s.player.play(s.request);
  await uriStarted;
  await s.player.stop(); complete("file:///late.mp3"); await pending;
  expect(s.play).not.toHaveBeenCalled(); expect(s.speak).not.toHaveBeenCalled();
});
it("only the latest tap can speak after asynchronous voice lookup", async () => {
  const s = setup();
  let complete!: (value: { identifier: string; language: string }[]) => void;
  let started!: () => void;
  const voiceLookupStarted = new Promise<void>((resolve) => { started = resolve; });
  s.voices.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; started(); }));
  const first = s.player.play({ ...s.request, recording: null });
  await voiceLookupStarted;
  await s.player.play({ ...s.request, text: "libro", recording: null });
  complete([{ identifier: "es", language: "es-ES" }]); await first;
  expect(s.speak).toHaveBeenCalledTimes(1);
  expect(s.speak.mock.calls[0][0]).toBe("libro");
  await s.player.stop();
});
it("falls back on load failure once, but cancellation suppresses fallback", async () => {
  jest.useFakeTimers();
  const s = setup(); await s.player.play(s.request);
  await jest.advanceTimersByTimeAsync(8000);
  expect(s.remove).toHaveBeenCalledTimes(1); expect(s.speak).toHaveBeenCalledTimes(1);
  await s.player.play(s.request); await s.player.stop();
  await jest.advanceTimersByTimeAsync(8000);
  expect(s.speak).toHaveBeenCalledTimes(1);
});
it("reports a missing voice and handles immediate MP3 playback errors", async () => {
  const s = setup(); s.play.mockImplementation(() => { throw new Error("playback failure"); });
  s.voices.mockResolvedValue([]);
  await s.player.play(s.request);
  expect(s.remove).toHaveBeenCalledTimes(1); expect(s.onError).toHaveBeenCalledTimes(1);
  await s.player.stop();
});


it("uses an independent volume for MP3 and updates an active recording", async () => {
  const s = setup();
  s.player.setVolume(0.25);
  await s.player.play(s.request);
  expect(s.audioPlayer.volume).toBe(0.25);
  s.player.setVolume(0.6);
  expect(s.audioPlayer.volume).toBe(0.6);
  await s.player.stop();
});
it("passes the flashcard volume to the speech fallback", async () => {
  const s = setup(); s.uri.mockResolvedValue(null);
  s.player.setVolume(0.4);
  await s.player.play(s.request);
  expect(s.speak).toHaveBeenCalledWith("agua", expect.objectContaining({ volume: 0.4 }));
  await s.player.stop();
});
it("volume zero mutes both sources without creating a player or looking up voices", async () => {
  const s = setup();
  s.player.setVolume(0);
  await s.player.play(s.request);
  await s.player.play({ ...s.request, recording: null });
  expect(s.create).not.toHaveBeenCalled();
  expect(s.voices).not.toHaveBeenCalled();
  expect(s.speak).not.toHaveBeenCalled();
  expect(s.onError).not.toHaveBeenCalled();
});
it("volume zero immediately stops an MP3 and cancels a pending speech lookup", async () => {
  const s = setup(); await s.player.play(s.request);
  s.player.setVolume(0);
  expect(s.remove).toHaveBeenCalledTimes(1);
  s.player.setVolume(1);
  let complete!: (value: { identifier: string; language: string }[]) => void;
  let started!: () => void;
  const ready = new Promise<void>((resolve) => { started = resolve; });
  s.voices.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; started(); }));
  const pending = s.player.play({ ...s.request, recording: null });
  await ready;
  s.player.setVolume(0);
  complete([{ identifier: "es", language: "es-ES" }]); await pending;
  expect(s.speak).not.toHaveBeenCalled();
});
it("volume zero stops ongoing speech; a later read uses the new volume", async () => {
  const s = setup();
  await s.player.play({ ...s.request, recording: null });
  s.stop.mockClear();
  s.player.setVolume(0);
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(s.stop).toHaveBeenCalled();
  s.player.setVolume(0.3);
  await s.player.play({ ...s.request, recording: null });
  expect(s.speak).toHaveBeenLastCalledWith("agua", expect.objectContaining({ volume: 0.3 }));
  await s.player.stop();
});
