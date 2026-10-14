import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { performance } from "node:perf_hooks";
import Papa from "papaparse";
import audioCatalogTools from "../tools/catalog.cjs";
const { createAudioId, audioTexts, readRecordings, saveRecording } = audioCatalogTools;
import { SAFETY_LIMITS, validateGenerationBatch, withGenerationSafety } from "./generation-safety.mjs";
import { DEFAULT_REQUESTS_PER_MINUTE, createRateLimiter, validateRequestRate } from "./rate-limit.mjs";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_CONFIG = join(ROOT_DIR, "Audio/generator/config.json");
const API = "https://texttospeech.googleapis.com/v1";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function saveJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(`${path}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
}

export function createPlan({ csv, column = "front_text", language, voice, limit = 50, output, textMode = "whole" }) {
  if (typeof language !== "string" || !/^[a-z]{2,3}-[A-Z]{2}$/.test(language)) throw new Error("Podaj język, np. es-ES lub fr-FR.");
  if (typeof voice !== "string" || !voice.startsWith(`${language}-`) || !/^[a-zA-Z0-9-]+$/.test(voice)) throw new Error("Wybrany głos nie pasuje do kodu języka.");
  if (!Number.isInteger(limit) || limit < 1 || limit > SAFETY_LIMITS.recordingsPerRun) {
    throw new Error(`--limit musi być liczbą całkowitą od 1 do ${SAFETY_LIMITS.recordingsPerRun}.`);
  }
  if (!["front_text", "back_text"].includes(column)) throw new Error("--column: front_text lub back_text.");
  const content = readFileSync(csv, "utf8");
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: "greedy" });
  if (parsed.errors.length) throw new Error(`Błąd CSV: ${parsed.errors[0].message}`);
  if (!parsed.meta.fields?.includes(column) || !parsed.meta.fields.includes("external_id")) {
    throw new Error(`CSV musi zawierać external_id i ${column}.`);
  }
  const ids = new Set();
  const entries = parsed.data.flatMap((row) => {
    const externalId = (row.external_id ?? "").trim();
    const text = (row[column] ?? "").trim().normalize("NFC");
    if (!/^[a-zA-Z0-9_-]+$/.test(externalId) || ids.has(externalId)) throw new Error("Niepoprawny albo powtórzony external_id w CSV (dozwolone litery, cyfry, - i _).");
    ids.add(externalId);
    if (!text) throw new Error(`Pusty tekst: ${externalId}.`);
    if (Buffer.byteLength(text, "utf8") > 5000) throw new Error(`Tekst ${externalId} przekracza 5000 bajtów.`);
    const texts = audioTexts(text, { mode: textMode, side: column === "front_text" ? "front" : "back" });
    if (!texts.length) throw new Error(`Pusty tekst: ${externalId}.`);
    return texts.map((text) => {
      const audioId = createAudioId({ text, language, voice });
      const entry = { externalId, text, audioId, file: `${audioId}.mp3` };
      validateGenerationBatch([entry]);
      return entry;
    });
  });
  if (!entries.length) throw new Error("CSV nie zawiera słów do wygenerowania.");
  const unique = [...new Map(entries.map((entry) => [entry.audioId, entry])).values()];
  const name = basename(csv, extname(csv)).replace(/[^a-zA-Z0-9_-]/g, "_");
  return {
    schemaVersion: 1,
    sourceCsv: resolve(csv),
    sourceSha256: sha256(content),
    column, language, voice, textMode, audioEncoding: "MP3",
    totalCards: parsed.data.length,
    output: resolve(output ?? join(ROOT_DIR, "Audio/generator/output", `${name}-${voice}`)),
    limit,
    entries,
    unique,
    characters: unique.reduce((sum, entry) => sum + [...entry.text].length, 0),
  };
}

function getAccessToken() {
  try {
    return execFileSync("gcloud", ["auth", "print-access-token"], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30000,
    }).trim();
  } catch {
    throw new Error("Nie udało się pobrać tokenu. Zainstaluj Google Cloud CLI i wykonaj gcloud auth login.");
  }
}

function selectBatch(missing, limit) {
  const batch = [];
  let characters = 0;
  for (const entry of missing) {
    const count = [...entry.text].length;
    if (batch.length >= limit || characters + count > SAFETY_LIMITS.charactersPerRun) break;
    batch.push(entry);
    characters += count;
  }
  validateGenerationBatch(batch);
  return { batch, characters };
}

function inspectProgress(plan, libraryRoot) {
  const recordings = readRecordings(libraryRoot);
  const existing = new Map();
  for (const entry of plan.unique) {
    const shared = join(libraryRoot, "library", plan.language, entry.file);
    const target = join(plan.output, entry.file);
    const legacy = join(plan.output, `${entry.externalId}-${entry.audioId.slice(0, 20)}.mp3`);
    const record = recordings[entry.audioId];
    if (record && createAudioId(record) !== entry.audioId) throw new Error(`Niepoprawna tożsamość nagrania: ${entry.audioId}`);
    const path = [shared, target, legacy].find((candidate) => existsSync(candidate) && statSync(candidate).size > 0);
    if (!path) {
      if (record && existsSync(shared)) throw new Error(`Uszkodzone nagranie we wspólnym magazynie: ${entry.audioId}`);
      continue;
    }
    const bytes = readFileSync(path);
    if (record && (bytes.length !== record.bytes || sha256(bytes) !== record.fileSha256)) {
      throw new Error(`Uszkodzone nagranie: ${entry.audioId}`);
    }
    existing.set(entry.audioId, path);
  }
  const missing = plan.unique.filter((entry) => !existing.has(entry.audioId));
  const { batch, characters } = selectBatch(missing, plan.limit);
  return { recordings, existing, missing, batch, characters };
}

export async function generate(plan, { project, dryRun = false, all = false, requestsPerMinute = DEFAULT_REQUESTS_PER_MINUTE, timing,
  signal, tokenProvider = getAccessToken, request = fetch, log = console.log, stateDir, budgetLimits = SAFETY_LIMITS, libraryRoot = join(ROOT_DIR, "Audio/content") } = {}) {
  if (!Number.isInteger(plan.limit) || plan.limit < 1 || plan.limit > SAFETY_LIMITS.recordingsPerRun) throw new Error("Niepoprawny rozmiar partii.");
  if (typeof all !== "boolean") throw new Error("all musi mieć wartość true albo false.");
  validateRequestRate(requestsPerMinute);
  signal?.throwIfAborted();
  const now = timing?.now ?? (() => performance.now());
  const waitForRequest = createRateLimiter(requestsPerMinute, { ...timing, now, signal });
  const report = (progress) => {
    log(`CSV: ${plan.sourceCsv}`);
    log(`Głos: ${plan.voice}; język: ${plan.language}; kolumna: ${plan.column}`);
    log(`Fiszki: ${plan.totalCards}; teksty/formy: ${plan.entries.length}; unikalne nagrania: ${plan.unique.length}`);
    log(`Postęp: ${progress.existing.size}/${plan.unique.length} gotowych; brakuje ${progress.missing.length}.`);
    log(`Ta partia: ${progress.batch.length} nowych MP3; ${progress.characters} znaków.`);
    log(`Tryb: ${all ? "automatycznie do końca CSV" : "jedna partia"}; tempo: do ${requestsPerMinute} żądań syntezy/min.`);
    if (all) log(`Całe zadanie: ${progress.missing.length} brakujących MP3; ${progress.missing.reduce((sum, entry) => sum + [...entry.text].length, 0)} znaków.`);
    log(`Wyniki: ${plan.output}`);
  };
  if (dryRun) {
    const progress = inspectProgress(plan, libraryRoot);
    report(progress);
    for (const entry of progress.batch.slice(0, 5)) log(`${entry.externalId}: ${entry.text}`);
    log("Podgląd zakończony. Bez wywołań Google, bez zapisywania plików i zmian licznika.");
    return { completedRecordings: progress.existing.size, remainingRecordings: progress.missing.length, batchRecordings: progress.batch.length };
  }
  return withGenerationSafety(async ({ checkBudget, checkTotalBudget, beginBatch, reserve }) => {
    const progress = inspectProgress(plan, libraryRoot);
    report(progress);
    if (all) checkTotalBudget(progress.missing);
    else checkBudget(progress.batch);
    const { recordings } = progress;
    const completed = new Set();
    const cardEntries = new Map();
    for (const entry of plan.entries) {
      if (!cardEntries.has(entry.externalId)) cardEntries.set(entry.externalId, []);
      cardEntries.get(entry.externalId).push(entry.audioId);
    }
    const registerRecording = (entry, target) => {
      const shared = join(libraryRoot, "library", plan.language, entry.file);
      const bytes = readFileSync(target);
      const checksum = sha256(bytes);
      if (existsSync(shared) && !readFileSync(shared).equals(bytes)) throw new Error(`Konflikt nagrania: ${entry.audioId}`);
      mkdirSync(dirname(shared), { recursive: true });
      if (target !== shared) {
        copyFileSync(target, `${shared}.tmp`);
        renameSync(`${shared}.tmp`, shared);
      }
      recordings[entry.audioId] = { text: entry.text, language: plan.language, voice: plan.voice,
        audioEncoding: plan.audioEncoding, file: `library/${plan.language}/${entry.file}`,
        bytes: bytes.length, fileSha256: checksum };
      saveRecording(libraryRoot, entry.audioId, recordings[entry.audioId]);
      completed.add(entry.audioId);
    };
    const saveProgress = () => {
      const entries = plan.entries.filter((entry) => completed.has(entry.audioId))
        .map((entry) => ({ ...entry, bytes: recordings[entry.audioId].bytes }));
      const totalAudioBytes = [...completed].reduce((sum, id) => sum + recordings[id].bytes, 0);
      const status = {
        totalCards: plan.totalCards,
        completedCards: [...cardEntries.values()].filter((ids) => ids.every((id) => completed.has(id))).length,
        totalRecordings: plan.unique.length, completedRecordings: completed.size,
        remainingRecordings: plan.unique.length - completed.size,
        complete: completed.size === plan.unique.length,
      };
      const { unique: _unique, entries: _entries, output: _output, limit: _limit, ...metadata } = plan;
      saveJson(join(plan.output, "manifest.json"), { ...metadata, ...status, entries, totalAudioBytes });
      saveJson(join(plan.output, "progress.json"), { ...metadata, ...status, totalAudioBytes, updatedAt: new Date().toISOString() });
      return status;
    };
    mkdirSync(plan.output, { recursive: true });
    for (const entry of plan.unique) {
      const existing = progress.existing.get(entry.audioId);
      if (!existing) continue;
      const target = join(plan.output, entry.file);
      if (existing !== target) {
        copyFileSync(existing, `${target}.tmp`);
        renameSync(`${target}.tmp`, target);
      }
      registerRecording(entry, target);
    }
    saveProgress();
    log(`Limity: do ${plan.limit} nagrań / ${SAFETY_LIMITS.charactersPerRun} znaków na partię; wspólnie ${budgetLimits.totalRequests} prób / ${budgetLimits.totalCharacters} znaków.`);
    let generated = 0;
    if (progress.batch.length) {
      if (!project) throw new Error("Podaj project w Audio/generator/config.json, --project albo ustaw projekt przez gcloud config set project PROJECT_ID.");
      const token = tokenProvider();
      if (!token) throw new Error("Google Cloud CLI zwróciło pusty token.");
      const headers = { "Content-Type": "application/json", "x-goog-user-project": project, Authorization: `Bearer ${token}` };
      let tokenTime = now();
      const apiRequest = async (path, options = {}) => {
        signal?.throwIfAborted();
        if (now() - tokenTime >= 45 * 60000) {
          const refreshed = tokenProvider();
          if (!refreshed) throw new Error("Google Cloud CLI zwróciło pusty token podczas odświeżania.");
          headers.Authorization = `Bearer ${refreshed}`;
          tokenTime = now();
        }
        const timeout = AbortSignal.timeout(60000);
        const response = await request(`${API}${path}`, { ...options, headers, signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
        const result = await response.json();
        if (!response.ok) throw new Error(`Google TTS HTTP ${response.status}: ${result.error?.message ?? "żądanie nie powiodło się"}`);
        return result;
      };
      const available = await apiRequest(`/voices?languageCode=${encodeURIComponent(plan.language)}`);
      if (!available.voices?.some((voice) => voice.name === plan.voice)) {
        throw new Error(`Głos ${plan.voice} nie jest dostępny. Sprawdź katalog głosów Google.`);
      }
      try {
        let pending = progress.missing;
        let batchNumber = 0;
        while (pending.length) {
          const { batch } = selectBatch(pending, plan.limit);
          beginBatch(batch);
          batchNumber += 1;
          log(`Partia ${batchNumber}: ${batch.length} nowych MP3; pozostało ${pending.length}.`);
          for (const [index, entry] of batch.entries()) {
            await waitForRequest();
            signal?.throwIfAborted();
            reserve(entry);
            const result = await apiRequest("/text:synthesize", {
              method: "POST",
              body: JSON.stringify({
                input: { text: entry.text },
                voice: { languageCode: plan.language, name: plan.voice },
                audioConfig: { audioEncoding: "MP3" },
              }),
            });
            if (typeof result.audioContent !== "string" || !result.audioContent) throw new Error(`Brak audio w odpowiedzi dla ${entry.externalId}.`);
            const audio = Buffer.from(result.audioContent, "base64");
            if (!audio.length) throw new Error(`Puste nagranie dla ${entry.externalId}.`);
            const target = join(plan.output, entry.file);
            writeFileSync(`${target}.tmp`, audio);
            renameSync(`${target}.tmp`, target);
            registerRecording(entry, target);
            saveProgress();
            generated += 1;
            log(`[partia ${batchNumber}: ${index + 1}/${batch.length}] ${entry.externalId}: ${entry.text} — ${audio.length} B; postęp ${completed.size}/${plan.unique.length}`);
          }
          pending = pending.slice(batch.length);
          if (!all) break;
        }
      } catch (error) {
        log("Przerwano partię. Zapisane MP3 zostają; uruchom tę samą komendę, aby wznowić od brakujących nagrań.");
        throw error;
      }
    }
    const status = saveProgress();
    log(`Gotowe: ${generated} nowych MP3; postęp ${status.completedRecordings}/${status.totalRecordings}; pozostało ${status.remainingRecordings}.`);
    log(status.complete ? "Cały CSV ma nagrania." : "Uruchom tę samą komendę, aby pobrać kolejną partię.");
    log(`Postęp: ${join(plan.output, "progress.json")}`);
    log(`Mapa fiszek i nagrań: ${join(plan.output, "manifest.json")}`);
    return status;
  }, { stateDir, budgetLimits });
}

export function loadSettings(configPath = DEFAULT_CONFIG, overrides = {}) {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const allowed = ["csv", "column", "language", "voice", "textMode", "limit", "requestsPerMinute", "output", "project", "budget"];
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("Konfiguracja musi być obiektem JSON.");
  for (const key of Object.keys(config)) {
    if (!allowed.includes(key)) throw new Error(`Nieznane ustawienie: ${key}.`);
  }
  const settings = { column: "front_text", limit: 50, ...config,
    ...Object.fromEntries(Object.entries(overrides).filter(([, value]) => value !== undefined)) };
  if (typeof settings.csv !== "string" || !settings.csv) throw new Error("Podaj csv w konfiguracji lub --csv.");
  // Configuration paths are always relative to the repository, including when run from Audio/generator/.
  settings.csv = resolve(ROOT_DIR, settings.csv);
  if (settings.output) settings.output = resolve(ROOT_DIR, settings.output);
  settings.limit = Number(settings.limit);
  settings.requestsPerMinute = Number(settings.requestsPerMinute ?? DEFAULT_REQUESTS_PER_MINUTE);
  validateRequestRate(settings.requestsPerMinute);
  settings.budgetLimits = config.budget ?? { totalRequests: SAFETY_LIMITS.totalRequests, totalCharacters: SAFETY_LIMITS.totalCharacters };
  for (const key of ["totalRequests", "totalCharacters"]) {
    if (!Number.isSafeInteger(settings.budgetLimits[key]) || settings.budgetLimits[key] < 1) throw new Error(`Niepoprawny limit budżetu: ${key}.`);
  }
  return settings;
}

function getConfiguredProject() {
  try {
    const project = execFileSync("gcloud", ["config", "get-value", "project"], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30000,
    }).trim();
    return project && project !== "(unset)" ? project : undefined;
  } catch { return undefined; }
}

async function main() {
  const { values } = parseArgs({ options: {
    config: { type: "string", default: DEFAULT_CONFIG },
    csv: { type: "string" },
    column: { type: "string" },
    "text-mode": { type: "string" },
    language: { type: "string" },
    voice: { type: "string" },
    limit: { type: "string" },
    all: { type: "boolean", default: false },
    "requests-per-minute": { type: "string" },
    output: { type: "string" },
    project: { type: "string" },
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  } });
  if (values.help) {
    console.log("npm run audio:google -- [--dry-run] [--csv PLIK] [--limit 5]");
    console.log("Ustawienia: Audio/generator/config.json lub --config PLIK. Argumenty nadpisują ustawienia.");
    console.log("Opcje: --project PROJECT_ID --column front_text|back_text --language es-ES --voice NAZWA --output KATALOG");
    console.log("--text-mode whole|variants: cały tekst albo osobne formy (front: średnik / nowy wiersz). Ustawienie JSON: textMode.");
    console.log("Każde uruchomienie: do 50 brakujących MP3 i 5000 znaków. Ponów tę samą komendę po następną partię.");
    console.log("--all: kontynuuj wszystkie partie do końca CSV; jedna wspólna blokada i jeden limiter dla całego zadania.");
    console.log("--requests-per-minute 150: maksymalne tempo syntezy (1–150), domyślnie 150. Ctrl+C zapisuje osiągnięty postęp i zwalnia blokadę.");
    console.log("Postęp zapisywany po każdym MP3. Wspólny licznik budżetu zachowuje wszystkie wcześniejsze próby.");
    return;
  }
  const { config, help: _help, all, "requests-per-minute": requestsPerMinute, "dry-run": dryRun, "text-mode": textMode, ...overrides } = values;
  const settings = loadSettings(resolve(config), { ...overrides, textMode, requestsPerMinute });
  const plan = createPlan(settings);
  // Avoid invoking gcloud for previews or already complete jobs.
  const project = settings.project || (!dryRun && inspectProgress(plan, join(ROOT_DIR, "Audio/content")).batch.length ? getConfiguredProject() : undefined);
  const controller = new AbortController();
  const stop = () => controller.abort(new Error("Generowanie przerwane przez użytkownika."));
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    await generate(plan, { project, dryRun, all, requestsPerMinute: settings.requestsPerMinute, budgetLimits: settings.budgetLimits, signal: controller.signal });
  } catch (error) {
    if (!controller.signal.aborted) throw error;
    console.error("Przerwano. Zapisane nagrania zostają; uruchom tę samą komendę, aby kontynuować.");
    process.exitCode = 130;
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Generowanie nie powiodło się.");
    process.exitCode = 1;
  });
}
