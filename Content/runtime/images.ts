import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { AppState } from 'react-native';
import { playAssetDelivery } from '@/Audio/modules/play-asset-delivery';
import { bundledImageSets, usesImagePAD } from './generated/bundledImages';
import { parseImageReference } from './catalog';
import { getPackDownload, refreshPack, subscribePackDownloads } from './packDownloads';
export { usesImagePAD };

async function imageFileExists(uri: string): Promise<boolean> {
  if (!uri.startsWith('file://')) return true;
  try {
    return (await FileSystem.getInfoAsync(uri)).exists;
  } catch {
    return false;
  }
}

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
  if (existing) {
    const uri = await existing;
    if (usesImagePAD || !uri || await imageFileExists(uri)) return uri;
    // Expo Go's cache can be removed while its Asset objects remain in memory.
    if (cache.get(value) === existing) cache.delete(value);
    else return resolveImageUri(value);
  }
  const request = (async () => {
    if (!usesImagePAD) {
      const module = bundledImageSets[ref.packName]?.[ref.imageId];
      if (!module) return null;
      const asset = Asset.fromModule(module);
      if (asset.localUri?.startsWith('file://') && !await imageFileExists(asset.localUri)) {
        // downloadAsync otherwise returns immediately when downloaded is true.
        asset.downloaded = false;
        asset.localUri = null;
      }
      await asset.downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      return await imageFileExists(uri) ? uri : null;
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
