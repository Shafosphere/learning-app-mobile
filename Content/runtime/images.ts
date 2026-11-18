import { Asset } from 'expo-asset';
import { AppState } from 'react-native';
import { playAssetDelivery } from '@/Audio/modules/play-asset-delivery';
import { bundledImageSets, usesImagePAD } from './generated/bundledImages';
import { parseImageReference } from './catalog';
import { getPackDownload, refreshPack, subscribePackDownloads } from './packDownloads';
export { usesImagePAD };

let epoch = 0;
const cache = new Map<string, Promise<string | null>>();
const listeners = new Set<() => void>();
const phases = new Map<string, string>();
export const subscribeImages = (listener: () => void) => { start(); listeners.add(listener); return () => { listeners.delete(listener); }; };
export const getImageRevision = () => epoch;
export function invalidateImages() {
  epoch++;
  cache.clear();
  listeners.forEach(listener => listener());
}
// Track locations only once a caller actually needs image resources.
let started = false;
function start() {
  if (started) return;
  started = true;
  subscribePackDownloads(() => {
    let changed = false;
    for (const [pack, phase] of phases) {
      const next = getPackDownload(pack).phase;
      if (next !== phase) { phases.set(pack, next); changed = true; }
    }
    if (changed) invalidateImages();
  });
  AppState.addEventListener('change', state => { if (state === 'active') invalidateImages(); });
}

export async function resolveImageUri(value: string): Promise<string | null> {
  if (!value.startsWith('asset://')) return value;
  start();
  const ref = parseImageReference(value);
  if (!ref) return null;
  const existing = cache.get(value);
  if (existing) return existing;
  const request = (async () => {
    if (!usesImagePAD) {
      const module = bundledImageSets[ref.packName]?.[ref.imageId];
      if (!module) return null;
      const asset = Asset.fromModule(module);
      await asset.downloadAsync();
      return asset.localUri ?? asset.uri;
    }
    phases.set(ref.packName, getPackDownload(ref.packName).phase);
    if (getPackDownload(ref.packName).phase !== 'ready') await refreshPack(ref.packName);
    if (getPackDownload(ref.packName).phase !== 'ready') return null;
    const uri = await playAssetDelivery?.resolveAssetUri(ref.packName, ref.file.relativePath) ?? null;
    return uri;
  })().catch(() => null);
  cache.set(value, request);
  // A missing file must be checked again when the user retries.
  void request.then(uri => { if (!uri && cache.get(value) === request) cache.delete(value); });
  return request;
}
