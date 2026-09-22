/**
 * Downloads preview-sized bird images listed in Ptaki_Polski_i_Europy_Srodkowej(1).tsv.
 *
 * Run: npm run assets:birds
 * Optional: npm run assets:birds -- --width=1600 --force
 */
import { createWriteStream, existsSync, promises as fs } from "node:fs";
import { basename, extname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

const sourcePath = "tools/prebuild-data/pl/Ptaki_Polski_i_Europy_Srodkowej(1).tsv";
const outputDir = "assets/images/birds";
const width = Number(process.argv.find((arg) => arg.startsWith("--width="))?.split("=")[1] ?? 1400);
const force = process.argv.includes("--force");
const requestDelayMs = 1_000;

type Bird = { number: string; fileName: string };

const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchWithRetry(url: string, init?: RequestInit) {
  const attempts = 5;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(url, init);
    if (response.status !== 429 && response.status < 500) return response;

    if (attempt === attempts) return response;
    const retryAfterSeconds = Number(response.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds * 1_000
      : 5_000 * 2 ** (attempt - 1);
    console.warn(`Wikimedia ogranicza ruch (HTTP ${response.status}); ponawiam za ${Math.ceil(delay / 1_000)} s…`);
    await pause(delay);
  }
  throw new Error("nieosiągalne");
}

function safeFileName(fileName: string, extension: string) {
  const stem = basename(fileName, extname(fileName))
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${stem || "bird"}${extension}`;
}

async function getImageUrl(fileName: string) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    origin: "*",
    prop: "imageinfo",
    iiprop: "url|mime",
    iiurlwidth: String(width),
    titles: `File:${fileName}`,
  });
  const response = await fetchWithRetry(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { "User-Agent": "MemicardBirdAssetDownloader/1.0 (local development)" },
  });
  if (!response.ok) throw new Error(`Wikimedia API: HTTP ${response.status}`);

  const data = (await response.json()) as {
    query?: { pages?: Array<{ imageinfo?: Array<{ thumburl?: string; url?: string; mime?: string }> }> };
  };
  const info = data.query?.pages?.[0]?.imageinfo?.[0];
  if (!info?.url) throw new Error("brak danych obrazu w Wikimedia Commons");
  return { url: info.thumburl ?? info.url, mime: info.mime ?? "" };
}

function extensionFor(url: string, mime: string) {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  const extension = extname(new URL(url).pathname).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp"].includes(extension) ? extension : ".jpg";
}

async function download(bird: Bird) {
  const image = await getImageUrl(bird.fileName);
  const target = join(outputDir, `${bird.number.padStart(2, "0")}_${safeFileName(bird.fileName, extensionFor(image.url, image.mime))}`);
  if (!force && existsSync(target)) return "pominięto (już istnieje)";

  const response = await fetchWithRetry(image.url, {
    headers: { "User-Agent": "MemicardBirdAssetDownloader/1.0 (local development)" },
  });
  if (!response.ok || !response.body) throw new Error(`pobieranie: HTTP ${response.status}`);
  // `fetch` is typed with the DOM stream declaration, while Node expects its
  // equivalent Web Streams declaration. They are compatible at runtime.
  await pipeline(Readable.fromWeb(response.body as unknown as NodeReadableStream), createWriteStream(target));
  return basename(target);
}

async function main() {
  if (!Number.isFinite(width) || width < 100 || width > 5000) {
    throw new Error("--width musi mieścić się w zakresie 100–5000");
  }
  await fs.mkdir(outputDir, { recursive: true });
  const rows = (await fs.readFile(sourcePath, "utf8")).trim().split(/\r?\n/).slice(1);
  const birds = rows.map((row) => {
    const columns = row.split("\t");
    return { number: columns[0], fileName: columns[3] };
  }).filter((bird) => bird.number && bird.fileName);

  const failures: string[] = [];
  for (const [index, bird] of birds.entries()) {
    try {
      const result = await download(bird);
      console.log(`[${index + 1}/${birds.length}] ${bird.fileName} — ${result}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${bird.number}\t${bird.fileName}\t${message}`);
      console.error(`[${index + 1}/${birds.length}] ${bird.fileName} — BŁĄD: ${message}`);
    }
    if (index < birds.length - 1) await pause(requestDelayMs);
  }

  if (failures.length) {
    const reportPath = join(outputDir, "download-errors.tsv");
    await fs.writeFile(reportPath, `nr\tnazwa_pliku\tbłąd\n${failures.join("\n")}\n`);
    console.error(`Nie pobrano ${failures.length} plików. Szczegóły: ${reportPath}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
