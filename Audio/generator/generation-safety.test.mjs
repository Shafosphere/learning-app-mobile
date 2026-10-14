import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { SAFETY_LIMITS, validateGenerationBatch, withGenerationSafety } from "./generation-safety.mjs";

const entry = (index, text = "tête") => ({ audioId: String(index), externalId: String(index), text });

test("rejects excess recordings, long individual texts, and excess total characters", () => {
  assert.throws(() => validateGenerationBatch(Array.from({ length: 51 }, (_, index) => entry(index))), /50 nagrań/);
  assert.throws(() => validateGenerationBatch([entry(1, "x".repeat(501))]), /500 znaków/);
  assert.throws(() => validateGenerationBatch(Array.from({ length: 11 }, (_, index) => entry(index, "x".repeat(500)))), /5000 znaków/);
});

test("a duplicate or runaway loop cannot reserve more than 50 calls per run", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "tts-safety-"));
  try {
    await withGenerationSafety(({ reserve }) => {
      reserve(entry(0));
      assert.throws(() => reserve(entry(0)), /ponowne wywołanie/);
      for (let index = 1; index < 50; index += 1) reserve(entry(index));
      assert.throws(() => reserve(entry(50)), /bieżącego uruchomienia/);
    }, { stateDir });
    assert.equal(JSON.parse(readFileSync(join(stateDir, "generation-budget.json"), "utf8")).requests, 50);
  } finally { rmSync(stateDir, { recursive: true, force: true }); }
});

test("the shared request budget persists across runs and blocks the 101st call", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "tts-safety-"));
  const budgetLimits = { totalRequests: 100, totalCharacters: 10000 };
  try {
    for (let run = 0; run < 2; run += 1) {
      await withGenerationSafety(({ reserve }) => {
        for (let index = 0; index < 50; index += 1) reserve(entry(run * 50 + index));
      }, { stateDir, budgetLimits });
    }
    await assert.rejects(withGenerationSafety(({ checkBudget }) => checkBudget([entry(101)]), { stateDir, budgetLimits }), /Wspólny limit/);
    const budget = JSON.parse(readFileSync(join(stateDir, "generation-budget.json"), "utf8"));
    assert.equal(budget.requests, budgetLimits.totalRequests);
    assert.equal(existsSync(join(stateDir, "generation.lock")), false);
  } finally { rmSync(stateDir, { recursive: true, force: true }); }
});

test("parallel generation is blocked while the first process owns the shared lock", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "tts-safety-"));
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const first = withGenerationSafety(async () => gate, { stateDir });
  try {
    await assert.rejects(withGenerationSafety(() => assert.fail("second job ran"), { stateDir }), /już uruchomiony/);
    assert.equal(existsSync(join(stateDir, "generation.lock")), true);
  } finally {
    release();
    await first;
    rmSync(stateDir, { recursive: true, force: true });
  }
});

test("an invalid budget stops generation rather than resetting the counter", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "tts-safety-"));
  try {
    const path = join(stateDir, "generation-budget.json");
    const original = JSON.stringify({ schemaVersion: 1, requests: -1, characters: 0 });
    writeFileSync(path, original);
    await assert.rejects(withGenerationSafety(() => assert.fail("operation ran"), { stateDir }), /Niepoprawny licznik/);
    assert.equal(readFileSync(path, "utf8"), original);
  } finally { rmSync(stateDir, { recursive: true, force: true }); }
});

test("the character budget stops further calls even before the request count is exhausted", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "tts-safety-"));
  try {
    for (let run = 0; run < 2; run += 1) {
      await withGenerationSafety(({ reserve }) => {
        for (let index = 0; index < 10; index += 1) reserve(entry(run * 10 + index, "x".repeat(500)));
      }, { stateDir });
    }
    await assert.rejects(withGenerationSafety(({ reserve }) => reserve(entry(21)), { stateDir }), /Wspólny limit/);
    const budget = JSON.parse(readFileSync(join(stateDir, "generation-budget.json"), "utf8"));
    assert.equal(budget.requests, 20);
    assert.equal(budget.characters, SAFETY_LIMITS.totalCharacters);
  } finally { rmSync(stateDir, { recursive: true, force: true }); }
});

test("raising a configured cap preserves the existing count instead of resetting it", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "tts-budget-config-"));
  try {
    writeFileSync(join(stateDir, "generation-budget.json"), JSON.stringify({ schemaVersion: 1, requests: 100, characters: 600 }));
    await assert.rejects(withGenerationSafety(({ reserve }) => reserve(entry(101)), {
      stateDir, budgetLimits: { totalRequests: 100, totalCharacters: 10000 },
    }), /Wspólny limit/);
    await withGenerationSafety(({ reserve }) => reserve(entry(101)), {
      stateDir, budgetLimits: { totalRequests: 500, totalCharacters: 10000 },
    });
    const budget = JSON.parse(readFileSync(join(stateDir, "generation-budget.json")));
    assert.equal(budget.requests, 101);
    assert.equal(budget.characters, 604);
    await assert.rejects(withGenerationSafety(() => assert.fail("invalid cap allowed"), {
      stateDir, budgetLimits: { totalRequests: 0, totalCharacters: 10000 },
    }), /Niepoprawny limit/);
  } finally { rmSync(stateDir, { recursive: true, force: true }); }
});

test("automatic batches share one budget and lock while preserving per-batch and duplicate guards", async () => {
  const stateDir = mkdtempSync(join(tmpdir(), "tts-multi-safety-"));
  try {
    await withGenerationSafety(({ beginBatch, reserve, checkTotalBudget }) => {
      const entries = Array.from({ length: 120 }, (_, i) => entry(i));
      checkTotalBudget(entries);
      for (let start = 0; start < 120; start += 50) {
        const batch = entries.slice(start, start + 50);
        beginBatch(batch);
        for (const item of batch) reserve(item);
      }
      beginBatch([entry(0)]);
      assert.throws(() => reserve(entry(0)), /ponowne wywołanie/);
      assert.throws(() => beginBatch(Array.from({ length: 51 }, (_, i) => entry(200 + i))), /50 nagrań/);
      assert.throws(() => checkTotalBudget(Array.from({ length: 31 }, (_, i) => entry(200 + i))), /Wspólny limit/);
    }, { stateDir, budgetLimits: { totalRequests: 150, totalCharacters: 10000 } });
    assert.equal(JSON.parse(readFileSync(join(stateDir, "generation-budget.json"))).requests, 120);
  } finally { rmSync(stateDir, { recursive: true, force: true }); }
});
