import assert from "node:assert/strict";
import { test } from "node:test";
import { createRateLimiter } from "./rate-limit.mjs";

test("150/min pacing never catches up in a burst after slow requests", async () => {
  let time = 0;
  const limiter = createRateLimiter(150, { now: () => time, sleep: async (ms) => { time += ms; } });
  const starts = [];
  for (let i = 0; i < 160; i += 1) {
    await limiter();
    starts.push(time);
    time += i === 75 ? 5000 : 120;
  }
  for (let i = 1; i < starts.length; i += 1) assert.ok(starts[i] - starts[i - 1] >= 401);
  for (const start of starts) assert.ok(starts.filter((time) => time >= start && time <= start + 60000).length <= 150);
});

test("an early wake waits the remaining time instead of sending too soon", async () => {
  let time = 0, sleeps = 0;
  const limiter = createRateLimiter(150, { now: () => time, sleep: async (ms) => { time += ++sleeps === 1 ? ms - 1 : ms; } });
  await limiter();
  await limiter();
  assert.equal(time, 401);
  assert.equal(sleeps, 2);
});

test("invalid rates are rejected before any wait or request", () => {
  for (const rate of [0, -1, 151, 1000000, 1.5, NaN]) assert.throws(() => createRateLimiter(rate), /od 1 do 150/);
});

test("an aborted limiter stops before obtaining a new permit", async () => {
  const controller = new AbortController();
  const limiter = createRateLimiter(150, { now: () => 0, signal: controller.signal,
    sleep: async () => controller.abort(new Error("cancelled")) });
  await limiter();
  await assert.rejects(limiter(), /cancelled/);
});
