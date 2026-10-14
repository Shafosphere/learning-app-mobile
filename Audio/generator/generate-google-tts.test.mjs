import audioSourceTools from "../tools/sources.cjs";
import { Buffer } from "node:buffer";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, readFileSync, readdirSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createPlan, generate, loadSettings } from "./generate-google-tts.mjs";
import { SAFETY_LIMITS, withGenerationSafety } from "./generation-safety.mjs";

function fakeTiming() {
  let time = 0;
  return { now: () => time, sleep: async (ms) => { time += ms; } };
}

const settings = {
  csv: join(dirname(fileURLToPath(import.meta.url)), "../../tools/prebuild-data/en/jezyki/francuski/FR_fiszki_50.csv"),
  column: "front_text", language: "fr-FR", voice: "fr-FR-Chirp3-HD-Aoede", limit: 50,
};

test("the preview selects 50 French texts, preserves accents, and never authenticates or calls Google", async () => {
  const root = mkdtempSync(join(tmpdir(), "tts-test-"));
  try {
    const plan = createPlan({ ...settings, output: join(root, "audio") });
    assert.equal(plan.entries.length, 50);
    assert.equal(plan.entries[2].text, "tête");
    assert.equal(plan.entries[2].externalId, "0003");
    await generate(plan, { dryRun: true, log: () => {},
      tokenProvider: () => assert.fail("preview attempted authentication"),
      request: () => assert.fail("preview attempted network access"),
    });
    assert.equal(existsSync(plan.output), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a resumed job synthesizes only missing files and saves the correct language/text mapping", async () => {
  const root = mkdtempSync(join(tmpdir(), "tts-test-"));
  try {
    const csv = join(root, "three.csv");
    writeFileSync(csv, "external_id,front_text,back_text\n0001,eau,water\n0002,livre,book\n0003,tête,head\n");
    const calls = [];
    const request = async (url, options) => {
      if (url.includes("/voices?")) return { ok: true, json: async () => ({ voices: [{ name: settings.voice }] }) };
      const body = JSON.parse(options.body);
      calls.push(body);
      return { ok: true, json: async () => ({ audioContent: Buffer.from(`test:${body.input.text}`).toString("base64") }) };
    };
    const deps = { timing: fakeTiming(), libraryRoot: join(root, "library"), stateDir: join(root, "state"), project: "test-project", tokenProvider: () => "test-token", request, log: () => {} };
    await generate(createPlan({ ...settings, csv, limit: 2, output: root }), deps);
    assert.equal(JSON.parse(readFileSync(join(root, "progress.json"))).remainingRecordings, 1);
    await generate(createPlan({ ...settings, csv, limit: 3, output: root }), deps);
    assert.deepEqual(calls.map((body) => body.input.text), ["eau", "livre", "tête"]);
    assert.equal(calls[2].voice.languageCode, "fr-FR");
    assert.equal(calls[2].voice.name, settings.voice);
    assert.equal(calls[2].audioConfig.audioEncoding, "MP3");
    const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
    assert.equal(manifest.entries[2].text, "tête");
    assert.match(manifest.entries[2].file, /^[a-f0-9]{64}\.mp3$/);
    assert.equal(readdirSync(root).filter((name) => name.endsWith(".mp3")).length, 3);
    await generate(createPlan({ ...settings, csv, limit: 3, output: root }), {
      ...deps, tokenProvider: () => assert.fail("already generated job attempted authentication"),
    });
    assert.equal(calls.length, 3);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("rejects mismatched voice languages and invalid limits before calling Google", () => {
  assert.throws(() => createPlan({ ...settings, output: "/tmp/unused", voice: "en-US-Chirp3-HD-Aoede" }), /nie pasuje/);
  assert.throws(() => createPlan({ ...settings, output: "/tmp/unused", limit: 0 }), /limit/);
});

test("rejects a million-item limit before CSV access or authentication", () => {
  assert.throws(() => createPlan({ ...settings, csv: "/tmp/nonexistent.csv", output: "/tmp/unused", limit: 1000000 }), /od 1 do 50/);
});

test("a failed synthesis consumes the durable budget and is not retried automatically", async () => {
  const root = mkdtempSync(join(tmpdir(), "tts-test-"));
  try {
    const stateDir = join(root, "state");
    let syntheses = 0;
    const request = async (url) => {
      if (url.includes("/voices?")) return { ok: true, json: async () => ({ voices: [{ name: settings.voice }] }) };
      syntheses += 1;
      throw new Error("simulated timeout");
    };
    const deps = { libraryRoot: join(root, "library"), stateDir, project: "test-project", tokenProvider: () => "test-token", request, log: () => {} };
    const plan = createPlan({ ...settings, limit: 1, output: join(root, "audio") });
    await assert.rejects(generate(plan, deps), /simulated timeout/);
    assert.equal(syntheses, 1);
    const budget = JSON.parse(readFileSync(join(stateDir, "generation-budget.json"), "utf8"));
    assert.equal(budget.requests, 1);
    assert.equal(budget.characters, 3);
    assert.equal(existsSync(join(stateDir, "generation.lock")), false);
    await assert.rejects(generate(plan, deps), /simulated timeout/);
    assert.equal(syntheses, 2);
    assert.equal(JSON.parse(readFileSync(join(stateDir, "generation-budget.json"), "utf8")).requests, 2);
  } finally { rmSync(root, { recursive: true, force: true }); }
});


test("an exhausted shared budget rejects the job before authentication or any Google request", async () => {
  const root = mkdtempSync(join(tmpdir(), "tts-test-"));
  try {
    const stateDir = join(root, "state");
    mkdirSync(stateDir);
    writeFileSync(join(stateDir, "generation-budget.json"), JSON.stringify({ schemaVersion: 1, requests: SAFETY_LIMITS.totalRequests, characters: 400 }));
    const plan = createPlan({ ...settings, limit: 1, output: join(root, "audio") });
    await assert.rejects(generate(plan, {
      libraryRoot: join(root, "library"), stateDir, project: "test-project", log: () => {},
      tokenProvider: () => assert.fail("exhausted job attempted authentication"),
      request: () => assert.fail("exhausted job attempted network access"),
    }), /Wspólny limit/);
    assert.equal(existsSync(plan.output), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("shared library reuses speech between different course IDs without Google calls", async () => {
  const root = mkdtempSync(join(tmpdir(), "tts-shared-"));
  try {
    const libraryRoot = join(root, "library");
    const first = createPlan({ ...settings, limit: 1, output: join(root, "first") });
    const deps = { timing: fakeTiming(), libraryRoot, stateDir: join(root, "state"), project: "test-project", log: () => {},
      tokenProvider: () => "test-token", request: async (url) => ({ ok: true, json: async () =>
        url.includes("/voices?") ? { voices: [{ name: settings.voice }] }
          : { audioContent: Buffer.from("test:eau").toString("base64") } }) };
    await generate(first, deps);
    const csv = join(root, "second.csv");
    writeFileSync(csv, "external_id,front_text,back_text\n0099,eau,woda\n");
    const second = createPlan({ ...settings, csv, limit: 1, output: join(root, "second") });
    assert.equal(first.entries[0].audioId, second.entries[0].audioId);
    await generate(second, { ...deps, project: undefined,
      tokenProvider: () => assert.fail("shared recording authenticated"),
      request: () => assert.fail("shared recording called Google") });
    assert.equal(readFileSync(join(second.output, second.entries[0].file), "utf8"), "test:eau");
    assert.equal(audioSourceTools.readRecordings(libraryRoot)[second.entries[0].audioId].text, "eau");
    assert.equal(JSON.parse(readFileSync(join(root, "state/generation-budget.json"))).requests, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("the same command advances through a whole CSV in batches of 50 and reports completion", async () => {
  const root = mkdtempSync(join(tmpdir(), "tts-batches-"));
  try {
    const csv = join(root, "course.csv");
    writeFileSync(csv, "external_id,front_text,back_text\n" + Array.from({ length: 123 }, (_, i) => `${i + 1},mot ${i + 1},word ${i + 1}`).join("\n"));
    const plan = createPlan({ ...settings, csv, output: join(root, "output") });
    assert.equal(plan.entries.length, 123);
    let calls = 0;
    const deps = { timing: fakeTiming(), libraryRoot: join(root, "library"), stateDir: join(root, "state"), project: "test", log: () => {},
      tokenProvider: () => "test", request: async (url, options) => {
        if (url.includes("/voices?")) return { ok: true, json: async () => ({ voices: [{ name: settings.voice }] }) };
        calls += 1;
        return { ok: true, json: async () => ({ audioContent: Buffer.from(JSON.parse(options.body).input.text).toString("base64") }) };
      } };
    for (const expected of [50, 100, 123]) {
      const status = await generate(plan, deps);
      assert.equal(calls, expected);
      assert.equal(status.completedRecordings, expected);
      assert.equal(status.remainingRecordings, 123 - expected);
      const manifest = JSON.parse(readFileSync(join(plan.output, "manifest.json")));
      assert.equal(manifest.entries.length, expected);
      assert.equal(manifest.complete, expected === 123);
    }
    await generate(plan, { ...deps, project: undefined,
      tokenProvider: () => assert.fail("complete CSV authenticated"), request: () => assert.fail("complete CSV used network") });
    assert.equal(JSON.parse(readFileSync(join(root, "state/generation-budget.json"))).requests, 123);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("interruption saves progress per MP3, then resumes; renaming, reordering and editing CSV do not rely on a cursor", async () => {
  const root = mkdtempSync(join(tmpdir(), "tts-resume-"));
  try {
    const csv = join(root, "course.csv");
    writeFileSync(csv, 'external_id,front_text,back_text\n1,"bonjour, salut",hello\n2,livre,book\n3,tête,head\n4,eau,water\n');
    const output = join(root, "output");
    const calls = [];
    let fail = true;
    const deps = { timing: fakeTiming(), libraryRoot: join(root, "library"), stateDir: join(root, "state"), project: "test", log: () => {},
      tokenProvider: () => "test", request: async (url, options) => {
        if (url.includes("/voices?")) return { ok: true, json: async () => ({ voices: [{ name: settings.voice }] }) };
        const text = JSON.parse(options.body).input.text;
        calls.push(text);
        if (fail && text === "tête") throw new Error("connection failed");
        return { ok: true, json: async () => ({ audioContent: Buffer.from(text).toString("base64") }) };
      } };
    await assert.rejects(generate(createPlan({ ...settings, csv, output }), deps), /connection failed/);
    const progress = JSON.parse(readFileSync(join(output, "progress.json")));
    assert.equal(progress.completedRecordings, 2);
    assert.equal(progress.remainingRecordings, 2);
    assert.equal(JSON.parse(readFileSync(join(output, "manifest.json"))).entries[0].text, "bonjour, salut");
    fail = false;
    await generate(createPlan({ ...settings, csv, output }), deps);
    assert.deepEqual(calls, ["bonjour, salut", "livre", "tête", "tête", "eau"]);
    const renamed = join(root, "renamed.csv");
    writeFileSync(renamed, 'external_id,front_text,back_text\n44,eau,water\n1,"bonjour, salut",hello\n2,livres,books\n33,eau,water\n');
    const status = await generate(createPlan({ ...settings, csv: renamed, output: join(root, "new-output") }), deps);
    assert.equal(status.totalCards, 4);
    assert.equal(status.totalRecordings, 3);
    assert.equal(status.completedCards, 4);
    assert.equal(calls.at(-1), "livres");
    assert.equal(calls.length, 6);
    assert.equal(JSON.parse(readFileSync(join(root, "state/generation-budget.json"))).requests, 6);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a batch fits the character cap even when the whole CSV is larger, and previews do not change progress", async () => {
  const root = mkdtempSync(join(tmpdir(), "tts-chars-"));
  try {
    const csv = join(root, "long.csv");
    writeFileSync(csv, "external_id,front_text,back_text\n" + Array.from({ length: 12 }, (_, i) => `${i},${String(i).padStart(3, "0") + "a".repeat(497)},word`).join("\n"));
    const plan = createPlan({ ...settings, csv, output: join(root, "output") });
    const status = await generate(plan, { dryRun: true, timing: fakeTiming(), libraryRoot: join(root, "library"), stateDir: join(root, "state"), log: () => {},
      tokenProvider: () => assert.fail("preview authenticated"), request: () => assert.fail("preview used network") });
    assert.equal(status.batchRecordings, 10);
    assert.equal(status.remainingRecordings, 12);
    assert.equal(existsSync(plan.output), false);
    assert.equal(existsSync(join(root, "state")), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("config defaults and CLI overrides resolve source/output paths from the repository", () => {
  const root = mkdtempSync(join(tmpdir(), "tts-config-"));
  try {
    const path = join(root, "config.json");
    writeFileSync(path, JSON.stringify({ csv: "first.csv", language: "es-ES", voice: "es-ES-Chirp3-HD-Aoede", budget: { totalRequests: 600, totalCharacters: 10000 } }));
    const settings = loadSettings(path, { csv: "second.csv", limit: "5", project: undefined });
    assert.equal(settings.csv, join(dirname(fileURLToPath(import.meta.url)), "../../second.csv"));
    assert.equal(settings.column, "front_text");
    assert.equal(settings.limit, 5);
    assert.equal(settings.budgetLimits.totalRequests, 600);
    writeFileSync(path, JSON.stringify({ csv: "x.csv", limti: 50 }));
    assert.throws(() => loadSettings(path), /Nieznane ustawienie/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("invalid data after the first 50 cards still blocks the entire plan before synthesis", () => {
  const root = mkdtempSync(join(tmpdir(), "tts-validation-"));
  try {
    const csv = join(root, "invalid.csv");
    writeFileSync(csv, "external_id,front_text,back_text\n" + Array.from({ length: 50 }, (_, i) => `${i},word,back`).join("\n") + "\n50,,back\n");
    assert.throws(() => createPlan({ ...settings, csv, output: root }), /Pusty tekst: 50/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("variant mode splits front forms on semicolons/newlines, preserves commas, and resumes within a card", async () => {
  const root = mkdtempSync(join(tmpdir(), "tts-variants-"));
  try {
    const csv = join(root, "forms.csv");
    writeFileSync(csv, 'external_id,front_text,back_text\n0038,fait; fais; fasse; faisons; fassent,do\n0099,"bonjour, salut",hello\n0100," fait; fait\nfais ",do\n');
    const plan = createPlan({ ...settings, csv, limit: 2, textMode: "variants", output: join(root, "output") });
    assert.equal(plan.totalCards, 3);
    assert.equal(plan.entries.length, 8);
    assert.equal(plan.unique.length, 6);
    assert.deepEqual(plan.entries.filter((entry) => entry.externalId === "0038").map((entry) => entry.text), ["fait", "fais", "fasse", "faisons", "fassent"]);
    assert.equal(plan.entries.find((entry) => entry.externalId === "0099").text, "bonjour, salut");
    const calls = [];
    const deps = { timing: fakeTiming(), libraryRoot: join(root, "library"), stateDir: join(root, "state"), project: "test", log: () => {}, tokenProvider: () => "test",
      request: async (url, options) => {
        if (url.includes("/voices?")) return { ok: true, json: async () => ({ voices: [{ name: settings.voice }] }) };
        const text = JSON.parse(options.body).input.text;
        calls.push(text);
        return { ok: true, json: async () => ({ audioContent: Buffer.from(text).toString("base64") }) };
      } };
    const first = await generate(plan, deps);
    assert.equal(first.totalCards, 3);
    assert.equal(first.completedCards, 1); // card 0100 shares the first two forms
    assert.equal(first.completedRecordings, 2);
    await generate(plan, deps);
    const last = await generate(plan, deps);
    assert.equal(last.completedCards, 3);
    assert.equal(last.complete, true);
    assert.equal(calls.length, 6);
    const manifest = JSON.parse(readFileSync(join(plan.output, "manifest.json")));
    assert.equal(manifest.entries.length, 8);
    assert.equal(manifest.textMode, "variants");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("all mode resumes saved MP3, completes multiple batches with one throttle/authentication, and keeps the lock", async () => {
  const root = mkdtempSync(join(tmpdir(), "tts-all-"));
  try {
    const csv = join(root, "course.csv"), output = join(root, "output"), stateDir = join(root, "state");
    writeFileSync(csv, "external_id,front_text,back_text\n" + Array.from({ length: 123 }, (_, i) => `${i + 1},mot ${i + 1},word`).join("\n"));
    let time = 0, auth = 0, voiceChecks = 0;
    const starts = [];
    const deps = { libraryRoot: join(root, "library"), stateDir, project: "test", log: () => {},
      timing: { now: () => time, sleep: async (ms) => { time += ms; } }, tokenProvider: () => { auth += 1; return "test"; },
      request: async (url, options) => {
        if (url.includes("/voices?")) { voiceChecks += 1; return { ok: true, json: async () => ({ voices: [{ name: settings.voice }] }) }; }
        starts.push(time);
        if (starts.length === 53) await assert.rejects(withGenerationSafety(() => assert.fail("second job ran"), { stateDir }), /już uruchomiony/);
        time += 170; // latency should count towards spacing, not add a whole new interval
        return { ok: true, json: async () => ({ audioContent: Buffer.from(JSON.parse(options.body).input.text).toString("base64") }) };
      } };
    await generate(createPlan({ ...settings, csv, output, limit: 2 }), deps);
    auth = 0; voiceChecks = 0; starts.length = 0;
    const status = await generate(createPlan({ ...settings, csv, output }), { ...deps, all: true });
    assert.equal(starts.length, 121);
    assert.equal(auth, 1);
    assert.equal(voiceChecks, 1);
    for (let i = 1; i < starts.length; i += 1) assert.equal(starts[i] - starts[i - 1], 401);
    assert.equal(status.completedRecordings, 123);
    assert.equal(status.complete, true);
    assert.equal(JSON.parse(readFileSync(join(stateDir, "generation-budget.json"))).requests, 123);
    assert.equal(existsSync(join(stateDir, "generation.lock")), false);
    await generate(createPlan({ ...settings, csv, output }), { ...deps, all: true,
      tokenProvider: () => assert.fail("completed job authenticated"), request: () => assert.fail("completed job called Google") });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("all mode rejects an insufficient total budget before authentication or output writes", async () => {
  const root = mkdtempSync(join(tmpdir(), "tts-all-budget-"));
  try {
    const csv = join(root, "course.csv");
    writeFileSync(csv, "external_id,front_text,back_text\n" + Array.from({ length: 60 }, (_, i) => `${i},word ${i},back`).join("\n"));
    const plan = createPlan({ ...settings, csv, output: join(root, "output") });
    await assert.rejects(generate(plan, { all: true, libraryRoot: join(root, "library"), stateDir: join(root, "state"), log: () => {},
      budgetLimits: { totalRequests: 50, totalCharacters: 10000 },
      tokenProvider: () => assert.fail("unfunded job authenticated"), request: () => assert.fail("unfunded job used network") }), /Wspólny limit/);
    assert.equal(existsSync(plan.output), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("cancelling during pacing keeps completed MP3 and releases the lock without charging an unsent request", async () => {
  const root = mkdtempSync(join(tmpdir(), "tts-cancel-"));
  try {
    const controller = new AbortController(), stateDir = join(root, "state");
    const plan = createPlan({ ...settings, limit: 2, output: join(root, "output") });
    let syntheses = 0;
    await assert.rejects(generate(plan, { all: true, signal: controller.signal, libraryRoot: join(root, "library"), stateDir,
      timing: { now: () => 0, sleep: async () => controller.abort(new Error("cancelled")) }, project: "test", log: () => {}, tokenProvider: () => "test",
      request: async (url) => {
        if (url.includes("/voices?")) return { ok: true, json: async () => ({ voices: [{ name: settings.voice }] }) };
        syntheses += 1;
        return { ok: true, json: async () => ({ audioContent: Buffer.from("eau").toString("base64") }) };
      } }), /cancelled/);
    assert.equal(syntheses, 1);
    assert.equal(JSON.parse(readFileSync(join(plan.output, "progress.json"))).completedRecordings, 1);
    assert.equal(JSON.parse(readFileSync(join(stateDir, "generation-budget.json"))).requests, 1);
    assert.equal(existsSync(join(stateDir, "generation.lock")), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("long automatic jobs refresh the access token before further synthesis", async () => {
  const root = mkdtempSync(join(tmpdir(), "tts-token-"));
  try {
    let time = 0, auth = 0;
    const headers = [];
    const csv = join(root, "course.csv");
    writeFileSync(csv, "external_id,front_text,back_text\n1,eau,water\n2,livre,book\n");
    await generate(createPlan({ ...settings, csv, output: join(root, "output") }), { all: true,
      libraryRoot: join(root, "library"), stateDir: join(root, "state"), project: "test", log: () => {},
      timing: { now: () => time, sleep: async (ms) => { time += ms; } }, tokenProvider: () => `token-${++auth}`,
      request: async (url, options) => {
        if (url.includes("/voices?")) return { ok: true, json: async () => ({ voices: [{ name: settings.voice }] }) };
        headers.push(options.headers.Authorization);
        time += 45 * 60000;
        return { ok: true, json: async () => ({ audioContent: Buffer.from("test").toString("base64") }) };
      } });
    assert.deepEqual(headers, ["Bearer token-1", "Bearer token-2"]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
