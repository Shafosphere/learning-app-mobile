// Opt in before starting Metro. No console/storage writes during transitions.
export const COURSE_ACTIVATION_DIAGNOSTICS_ENABLED =
  __DEV__ && process.env.EXPO_PUBLIC_COURSE_ACTIVATION_DIAGNOSTICS === "1";

const CAPACITY = 500;
type DiagnosticEvent = {
  sequence: number;
  timestamp: number;
  event: string;
  details: Record<string, unknown>;
};
const events: DiagnosticEvent[] = [];
let count = 0;
let lastTimestamp = 0;

export function recordCourseActivationEvent(event: string, details: Record<string, unknown> = {}) {
  if (!COURSE_ACTIVATION_DIAGNOSTICS_ENABLED) return;
  lastTimestamp = Math.max(lastTimestamp, performance.now());
  events[count % CAPACITY] = { sequence: count, timestamp: lastTimestamp, event, details };
  count += 1;
}

export function resetCourseActivationDiagnostics() {
  events.length = 0;
  count = 0;
  lastTimestamp = 0;
}

export function readCourseActivationDiagnostics() {
  const ordered = count > CAPACITY
    ? [...events.slice(count % CAPACITY), ...events.slice(0, count % CAPACITY)]
    : events;
  return {
    enabled: COURSE_ACTIVATION_DIAGNOSTICS_ENABLED,
    dropped: Math.max(0, count - CAPACITY),
    events: ordered.map((entry) => ({ ...entry, details: { ...entry.details } })),
  };
}

if (COURSE_ACTIVATION_DIAGNOSTICS_ENABLED) {
  // Available from React Native DevTools Console without importing app modules.
  (globalThis as typeof globalThis & {
    __courseActivationDiagnostics?: {
      read: typeof readCourseActivationDiagnostics;
      reset: typeof resetCourseActivationDiagnostics;
    };
  }).__courseActivationDiagnostics = {
    read: readCourseActivationDiagnostics,
    reset: resetCourseActivationDiagnostics,
  };
}
