import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";

export const DEFAULT_REQUESTS_PER_MINUTE = 150;

export function validateRequestRate(requestsPerMinute) {
  if (!Number.isInteger(requestsPerMinute) || requestsPerMinute < 1 || requestsPerMinute > DEFAULT_REQUESTS_PER_MINUTE) {
    throw new Error(`requestsPerMinute / --requests-per-minute: liczba całkowita od 1 do ${DEFAULT_REQUESTS_PER_MINUTE}.`);
  }
}

// One limiter for the entire job; never reset it at batch boundaries.
// Monotonic time and a small rounding margin prevent catch-up bursts.
export function createRateLimiter(requestsPerMinute = DEFAULT_REQUESTS_PER_MINUTE, {
  now = () => performance.now(), signal,
  sleep = (ms) => delay(ms, undefined, { signal }),
} = {}) {
  validateRequestRate(requestsPerMinute);
  const interval = Math.ceil(60000 / requestsPerMinute) + 1;
  let nextStart = -Infinity;
  return async () => {
    signal?.throwIfAborted();
    while (now() < nextStart) {
      await sleep(nextStart - now());
      signal?.throwIfAborted();
    }
    nextStart = now() + interval;
  };
}
