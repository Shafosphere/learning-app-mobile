import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const SAFETY_LIMITS = Object.freeze({
  recordingsPerRun: 50,
  charactersPerRun: 5000,
  charactersPerText: 500,
  totalRequests: 500,
  totalCharacters: 10000,
});
export const DEFAULT_STATE_DIR = join(dirname(fileURLToPath(import.meta.url)), "state");
const countCharacters = (text) => [...text].length;

export function validateGenerationBatch(entries) {
  if (entries.length > SAFETY_LIMITS.recordingsPerRun) {
    throw new Error(`Limit bezpieczeństwa: maksymalnie ${SAFETY_LIMITS.recordingsPerRun} nagrań na uruchomienie.`);
  }
  let characters = 0;
  for (const entry of entries) {
    if (!entry.text || countCharacters(entry.text) > SAFETY_LIMITS.charactersPerText) {
      throw new Error(`Limit bezpieczeństwa: tekst ${entry.externalId} może mieć maksymalnie ${SAFETY_LIMITS.charactersPerText} znaków.`);
    }
    characters += countCharacters(entry.text);
  }
  if (characters > SAFETY_LIMITS.charactersPerRun) {
    throw new Error(`Limit bezpieczeństwa: maksymalnie ${SAFETY_LIMITS.charactersPerRun} znaków na uruchomienie.`);
  }
  return characters;
}

function saveBudget(path, budget) {
  writeFileSync(`${path}.tmp`, `${JSON.stringify(budget, null, 2)}\n`, { mode: 0o600 });
  renameSync(`${path}.tmp`, path);
}

function readBudget(path) {
  if (!existsSync(path)) return { schemaVersion: 1, requests: 0, characters: 0 };
  const budget = JSON.parse(readFileSync(path, "utf8"));
  if (budget.schemaVersion !== 1 || !Number.isSafeInteger(budget.requests) || budget.requests < 0
      || !Number.isSafeInteger(budget.characters) || budget.characters < 0) {
    throw new Error("Niepoprawny licznik bezpieczeństwa. Generowanie zablokowane; licznik nie zostanie automatycznie wyzerowany.");
  }
  return budget;
}

// One lock and one durable budget for every output folder, language and voice.
export async function withGenerationSafety(operation, { stateDir = DEFAULT_STATE_DIR, budgetLimits = SAFETY_LIMITS } = {}) {
  for (const key of ["totalRequests", "totalCharacters"]) {
    if (!Number.isSafeInteger(budgetLimits[key]) || budgetLimits[key] < 1) {
      throw new Error(`Niepoprawny limit budżetu: ${key} musi być dodatnią liczbą całkowitą.`);
    }
  }
  mkdirSync(stateDir, { recursive: true });
  const lockPath = join(stateDir, "generation.lock");
  let lock;
  try {
    lock = openSync(lockPath, "wx", 0o600);
  } catch (error) {
    if (error.code === "EEXIST") throw new Error("Generator jest już uruchomiony lub pozostała blokada po przerwaniu. Sprawdź Audio/generator/state/generation.lock; nie uruchamiam drugiej instancji.");
    throw error;
  }
  try {
    writeFileSync(lock, `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`);
    const budgetPath = join(stateDir, "generation-budget.json");
    const budget = readBudget(budgetPath);
    let runRequests = 0;
    let runCharacters = 0;
    const reserved = new Set();
    const checkTotalBudget = (entries) => {
      const characters = entries.reduce((sum, entry) => sum + countCharacters(entry.text), 0);
      if (!entries.length) return;
      if (budget.requests + entries.length > budgetLimits.totalRequests
          || budget.characters + characters > budgetLimits.totalCharacters) {
        throw new Error(`Wspólny limit bezpieczeństwa: ${budget.requests}/${budgetLimits.totalRequests} prób syntezy i ${budget.characters}/${budgetLimits.totalCharacters} znaków. To zadanie przekroczyłoby limit; generowanie zablokowane. Zwiększ odpowiedni limit w konfiguracji po sprawdzeniu licznika; nie usuwaj stanu.`);
      }
    };
    const checkBudget = (entries) => {
      validateGenerationBatch(entries);
      checkTotalBudget(entries);
    };
    const beginBatch = (entries) => {
      checkBudget(entries);
      runRequests = 0;
      runCharacters = 0;
    };
    const reserve = (entry) => {
      checkBudget([entry]);
      const characters = countCharacters(entry.text);
      if (reserved.has(entry.audioId)) throw new Error("Zablokowano ponowne wywołanie dla tego samego nagrania w jednym uruchomieniu.");
      if (runRequests >= SAFETY_LIMITS.recordingsPerRun || runCharacters + characters > SAFETY_LIMITS.charactersPerRun) {
        throw new Error("Przekroczono limit wywołań lub znaków bieżącego uruchomienia.");
      }
      reserved.add(entry.audioId);
      runRequests += 1;
      runCharacters += characters;
      budget.requests += 1;
      budget.characters += characters;
      // Count before sending: timeouts and interrupted requests may still be billed.
      saveBudget(budgetPath, budget);
    };
    return await operation({ checkBudget, checkTotalBudget, beginBatch, reserve });
  } finally {
    closeSync(lock);
    unlinkSync(lockPath);
  }
}
