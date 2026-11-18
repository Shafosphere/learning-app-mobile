import images from './generated/images.json';
import { getAudioPack } from '@/Audio/runtime/catalog';
import dependencies from './generated/courses.json';

export type ContentPack = { kind: 'audio' | 'images'; sourceBytes: number; manifestHash: string; titleKey?: string };
export type ImagePack = ContentPack & { kind: 'images'; titleKey: string; files: Record<string, { relativePath: string; source: string; bytes: number; fileSha256: string }> };
const imagePacks = images.packs as Record<string, ImagePack>;
const courses = dependencies as Record<string, string[]>;
export const getImagePack = (name: string) => imagePacks[name];
export function getContentPack(name: string): ContentPack | undefined {
  const pack = getImagePack(name);
  if (pack) return pack;
  const audio = getAudioPack(name);
  return audio ? { ...audio, kind: 'audio' } : undefined;
}
export const getCourseImagePacks = (slug: string | null | undefined): string[] => slug ? courses[slug] ?? [] : [];
export function parseImageReference(value: string) {
  const match = /^asset:\/\/(images_[a-z0-9_]+)\/(.+)$/.exec(value);
  if (!match) return null;
  const pack = getImagePack(match[1]);
  const file = pack?.files[match[2]];
  return file ? { packName: match[1], imageId: match[2], file } : null;
}
