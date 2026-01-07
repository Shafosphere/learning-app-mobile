import * as FileSystem from "expo-file-system/legacy";

const MAX_IMAGE_BYTES = 7 * 1024 * 1024; // ~7MB safety cap

const getBaseDir = (): string => {
  const dir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!dir) {
    throw new Error("Brak katalogu dokumentów do zapisu obrazków.");
  }
  return dir;
};

const getImagesDir = (): string => `${getBaseDir()}images/`;

const ensureImagesDir = async (): Promise<string> => {
  const dir = getImagesDir();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
};

const extractExtension = (source?: string | null): string => {
  if (!source) return "jpg";
  const match = /\.(\w{2,5})($|\?)/i.exec(source);
  const ext = match?.[1]?.toLowerCase();
  if (!ext) return "jpg";
  if (ext === "jpeg") return "jpg";
  return ext;
};

const buildFileName = (extension?: string | null) => {
  const safeExt = extractExtension(extension);
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}-${randomPart}.${safeExt}`;
};

const assertBelowSizeLimit = (bytes: number, context: string) => {
  if (bytes > MAX_IMAGE_BYTES) {
    throw new Error(`${context} jest za duży (limit ~${Math.floor(MAX_IMAGE_BYTES / 1024 / 1024)}MB).`);
  }
};

export const isManagedImageUri = (uri?: string | null): boolean => {
  if (!uri) return false;
  return uri.startsWith(getImagesDir());
};

export async function saveImage(uri: string): Promise<string> {
  if (!uri) {
    throw new Error("Nieprawidłowy URI obrazka.");
  }
  if (isManagedImageUri(uri)) {
    return uri;
  }

  const dir = await ensureImagesDir();
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists && typeof info.size === "number") {
    assertBelowSizeLimit(info.size, "Obraz");
  }

  const filename = buildFileName(uri);
  const target = `${dir}${filename}`;
  await FileSystem.copyAsync({ from: uri, to: target });
  return target;
}

export async function deleteImage(uri?: string | null): Promise<void> {
  if (!uri || !isManagedImageUri(uri)) return;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch (error) {
    console.warn("[imageService] Failed to delete image", { uri, error });
  }
}

export async function importImageFromZip(
  base64Content: string,
  filename: string
): Promise<string> {
  const dir = await ensureImagesDir();
  const bytes = Math.floor((base64Content.length * 3) / 4);
  assertBelowSizeLimit(bytes, filename);
  const target = `${dir}${buildFileName(filename)}`;
  await FileSystem.writeAsStringAsync(target, base64Content, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return target;
}

export const imagesDir = getImagesDir;
