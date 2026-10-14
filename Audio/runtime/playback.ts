import type { Recording } from "./catalog";
import { playAssetDelivery } from "@/Audio/modules/play-asset-delivery";

type Speech = typeof import("expo-speech");
type Audio = typeof import("expo-audio");
type Player = ReturnType<Audio["createAudioPlayer"]>;
type Dependencies = { speech: () => Speech; audio: () => Audio; uri: (recording: Recording) => Promise<string | null> };
type ReadRequest = { text: string; language: string; recording: Recording | null; onError: () => void };

export function createFlashcardAudioPlayer(deps: Dependencies) {
  let generation = 0;
  let volume = 1;
  let player: Player | null = null;
  let subscription: { remove: () => void } | null = null;
  let loadTimer: ReturnType<typeof setTimeout> | null = null;
  let speech: Speech | null = null;
  let stopQueue = Promise.resolve();

  const clearPlayer = () => {
    if (loadTimer) clearTimeout(loadTimer);
    loadTimer = null;
    subscription?.remove();
    subscription = null;
    const previous = player;
    player = null;
    try { previous?.remove(); } catch { /* Player may already have been released by native code. */ }
  };
  const stopSpeech = () => {
    const current = speech;
    stopQueue = stopQueue.then(async () => { await current?.stop(); }).catch(() => {});
    return stopQueue;
  };
  const stop = () => {
    generation += 1;
    clearPlayer();
    return stopSpeech();
  };
  const setVolume = (value: number) => {
    volume = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
    if (volume === 0) void stop();
    else if (player) player.volume = volume;
  };
  const play = async (request: ReadRequest) => {
    const token = ++generation;
    const current = () => token === generation;
    clearPlayer();
    await stopSpeech();
    if (!current() || volume === 0 || !request.text.trim()) return;
    let fallbackStarted = false;
    const fallback = async () => {
      if (!current() || fallbackStarted) return;
      fallbackStarted = true;
      clearPlayer();
      try {
        speech = deps.speech();
        const module = speech;
        const voices = await module.getAvailableVoicesAsync();
        if (!current()) return;
        const language = request.language.toLowerCase();
        const voice = voices.find((entry) => entry.language.toLowerCase() === language)
          ?? voices.find((entry) => entry.language.toLowerCase().split(/[-_]/)[0] === language.split("-")[0]);
        if (!voice) throw new Error("No voice for flashcard language");
        module.speak(request.text.slice(0, module.maxSpeechInputLength), {
          language: request.language, voice: voice.identifier, rate: 1, pitch: 1, volume,
          onError: () => { if (current()) request.onError(); },
        });
      } catch { if (current()) request.onError(); }
    };
    try {
      const uri = request.recording ? await deps.uri(request.recording) : null;
      if (!current()) return;
      if (!uri) { await fallback(); return; }
      const module = deps.audio();
      await module.setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
      if (!current()) return;
      const next = module.createAudioPlayer({ uri });
      player = next;
      next.volume = volume;
      // expo-audio does not expose an Android playback-error event. A local file
      // must load promptly; otherwise release it and use device speech.
      loadTimer = setTimeout(() => { void fallback(); }, 8000);
      subscription = next.addListener("playbackStatusUpdate", (status) => {
        if (!current()) return;
        if (status.isLoaded && loadTimer) { clearTimeout(loadTimer); loadTimer = null; }
        if (status.didJustFinish) clearPlayer();
        else if (status.playbackState === "error" || (status.isLoaded && status.playbackState === "idle")) void fallback();
      });
      next.play();
    } catch { await fallback(); }
  };
  return { play, stop, setVolume };
}

export const flashcardAudioPlayer = createFlashcardAudioPlayer({
  // Lazy loading keeps older development clients usable without these modules.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  speech: () => require("expo-speech"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  audio: () => require("expo-audio"),
  uri: async (recording) => playAssetDelivery?.resolveAssetUri(recording.packName, recording.relativePath) ?? null,
});
