import data from "./generated/catalog.json";

export type AudioSide = "front" | "back";
export type Recording = { text: string; language: string; packName: string; relativePath: string };
export type AudioCourse = {
  frontLanguage: string;
  backLanguage: string;
  requiredPacks: string[];
};
type CatalogCourse = AudioCourse & { cards: Record<string, Partial<Record<AudioSide, number | number[]>>> };
export type AudioPack = { deliveryMode: string; sourceBytes: number; recordingCount: number; manifestHash: string };
type AudioCatalog = {
  schemaVersion: number;
  recordings: { audioId: string; text: string; language: string; packName: string }[];
  packs: Record<string, AudioPack>;
  courses: Record<string, CatalogCourse>;
};
const catalog: AudioCatalog = data;
if (catalog.schemaVersion !== 2) throw new Error("Unsupported audio catalog version");
export const normalizeAudioText = (text: string) => text.trim().normalize("NFC");
export const getAudioCourse = (slug: string | null | undefined): AudioCourse | undefined => slug ? catalog.courses[slug] : undefined;
export const getAudioPack = (name: string): AudioPack | undefined => catalog.packs[name];

export function resolveRecording(slug: string | null, externalId: string | null | undefined, side: AudioSide, text: string) {
  const course = slug ? catalog.courses[slug] : undefined;
  if (!course) return null;
  const language = course[side === "front" ? "frontLanguage" : "backLanguage"];
  const index = externalId ? course.cards[externalId]?.[side] : undefined;
  const indexes = Array.isArray(index) ? index : index === undefined ? [] : [index];
  const normalized = normalizeAudioText(text);
  const entry = indexes.map((index) => catalog.recordings[index])
    .find((candidate) => candidate?.language === language && candidate.text === normalized);
  const recording: Recording | null = entry ? { text: entry.text, language: entry.language,
    packName: entry.packName, relativePath: `${entry.audioId}.mp3` } : null;
  return { language, recording };
}
