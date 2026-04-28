import * as FileSystem from "expo-file-system/legacy";
import { Image as RNImage } from "react-native";

const MAX_PRELOADED_IMAGES = 8;

export type PreloadedImage =
  | { kind: "svg"; uri: string; xml: string; ratio: number }
  | { kind: "bitmap"; uri: string; ratio: number };

const cache = new Map<string, PreloadedImage>();
const inFlight = new Map<string, Promise<void>>();

export const isSvgImageUri = (value: string): boolean =>
  /\.svg(\?|#|$)/i.test(value) || value.startsWith("data:image/svg+xml");

export const parseSvgRatio = (xml: string): number => {
  const viewBoxMatch = xml.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const [, , width, height] = parts;
      if (width > 0 && height > 0) return width / height;
    }
  }

  const widthMatch = xml.match(/width\s*=\s*["']([\d.]+)[^"']*["']/i);
  const heightMatch = xml.match(/height\s*=\s*["']([\d.]+)[^"']*["']/i);
  if (widthMatch && heightMatch) {
    const width = Number(widthMatch[1]);
    const height = Number(heightMatch[1]);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return width / height;
    }
  }

  return 1;
};

const refreshCacheEntry = (uri: string, entry: PreloadedImage) => {
  cache.delete(uri);
  cache.set(uri, entry);
};

const trimCache = () => {
  while (cache.size > MAX_PRELOADED_IMAGES) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) return;
    cache.delete(oldestKey);
  }
};

const cacheEntry = (entry: PreloadedImage) => {
  refreshCacheEntry(entry.uri, entry);
  trimCache();
};

const decodeDataSvg = (uri: string): string => {
  const [metadata, raw = ""] = uri.split(",", 2);
  if (/;base64(?:;|$)/i.test(metadata)) {
    const binary = atob(decodeURIComponent(raw).replace(/\s/g, ""));
    const encoded = Array.from(binary, (char) =>
      `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`
    ).join("");
    return decodeURIComponent(encoded);
  }

  return decodeURIComponent(raw);
};

const getBitmapRatio = (uri: string): Promise<number> =>
  new Promise((resolve, reject) => {
    RNImage.getSize(
      uri,
      (width, height) => {
        if (width > 0 && height > 0) {
          resolve(width / height);
          return;
        }
        resolve(1);
      },
      reject
    );
  });

const loadImage = async (uri: string): Promise<PreloadedImage | null> => {
  if (uri.startsWith("data:image/svg+xml")) {
    const xml = decodeDataSvg(uri);
    return { kind: "svg", uri, xml, ratio: parseSvgRatio(xml) };
  }

  if (isSvgImageUri(uri) && (uri.startsWith("http://") || uri.startsWith("https://"))) {
    return null;
  }

  if (isSvgImageUri(uri) && !uri.startsWith("http://") && !uri.startsWith("https://")) {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    const xml = await FileSystem.readAsStringAsync(uri);
    return { kind: "svg", uri, xml, ratio: parseSvgRatio(xml) };
  }

  const ratio = await getBitmapRatio(uri);
  return { kind: "bitmap", uri, ratio };
};

const preloadOne = (uri: string): Promise<void> => {
  if (cache.has(uri)) {
    const entry = cache.get(uri);
    if (entry) refreshCacheEntry(uri, entry);
    return Promise.resolve();
  }

  const running = inFlight.get(uri);
  if (running) return running;

  const task = loadImage(uri)
    .then((entry) => {
      if (entry) cacheEntry(entry);
    })
    .catch(() => {
      // Best effort: preload must never affect flashcard rendering.
    })
    .finally(() => {
      inFlight.delete(uri);
    });

  inFlight.set(uri, task);
  return task;
};

export const preloadFlashcardImageUris = (uris: string[]): void => {
  const uniqueUris = Array.from(new Set(uris.filter(Boolean))).slice(
    0,
    MAX_PRELOADED_IMAGES
  );

  uniqueUris.forEach((uri) => {
    void preloadOne(uri);
  });
};

export const getPreloadedImage = (uri: string): PreloadedImage | null => {
  const entry = cache.get(uri);
  if (!entry) return null;
  refreshCacheEntry(uri, entry);
  return entry;
};

export const __resetFlashcardImagePreloadForTests = () => {
  cache.clear();
  inFlight.clear();
};

export const __waitForFlashcardImagePreloadForTests = async () => {
  await Promise.all(Array.from(inFlight.values()));
};

export const __getPreloadedImageCountForTests = () => cache.size;
