type Diagnostics = typeof import("../courseActivationDiagnostics");
const runtime = globalThis as typeof globalThis & {
  __DEV__: boolean;
  __courseActivationDiagnostics?: unknown;
};
const originalDev = runtime.__DEV__;
const originalFlag = process.env.EXPO_PUBLIC_COURSE_ACTIVATION_DIAGNOSTICS;

function load(dev: boolean, flag: string): Diagnostics {
  runtime.__DEV__ = dev;
  process.env.EXPO_PUBLIC_COURSE_ACTIVATION_DIAGNOSTICS = flag;
  let diagnostics!: Diagnostics;
  jest.isolateModules(() => {
    diagnostics = jest.requireActual("../courseActivationDiagnostics");
  });
  return diagnostics;
}
afterEach(() => {
  runtime.__DEV__ = originalDev;
  if (originalFlag === undefined) delete process.env.EXPO_PUBLIC_COURSE_ACTIVATION_DIAGNOSTICS;
  else process.env.EXPO_PUBLIC_COURSE_ACTIVATION_DIAGNOSTICS = originalFlag;
  delete runtime.__courseActivationDiagnostics;
  jest.restoreAllMocks();
});

it.each([[false, "1"], [true, "0"]])("stays inactive for dev=%s flag=%s", (dev, flag) => {
  const diagnostics = load(dev, flag);
  diagnostics.recordCourseActivationEvent("ignored");
  expect(diagnostics.readCourseActivationDiagnostics()).toEqual({ enabled: false, dropped: 0, events: [] });
  expect(runtime.__courseActivationDiagnostics).toBeUndefined();
});

it("bounds memory, preserves event order and exposes reset/read without console or storage writes", () => {
  const log = jest.spyOn(console, "info");
  const diagnostics = load(true, "1");
  for (let i = 0; i < 510; i++) diagnostics.recordCourseActivationEvent("measurement", { index: i });
  const report = diagnostics.readCourseActivationDiagnostics();
  expect(report.events).toHaveLength(500);
  expect(report.dropped).toBe(10);
  expect(report.events[0]).toMatchObject({ sequence: 10, details: { index: 10 } });
  expect(report.events[499]).toMatchObject({ sequence: 509 });
  expect(report.events.every((entry, i) => i === 0 || entry.timestamp >= report.events[i - 1].timestamp)).toBe(true);
  report.events[0].details.index = -1;
  expect(diagnostics.readCourseActivationDiagnostics().events[0].details.index).toBe(10);
  expect(runtime.__courseActivationDiagnostics).toEqual({
    read: diagnostics.readCourseActivationDiagnostics, reset: diagnostics.resetCourseActivationDiagnostics,
  });
  expect(log).not.toHaveBeenCalled();
  diagnostics.resetCourseActivationDiagnostics();
  expect(diagnostics.readCourseActivationDiagnostics()).toEqual({ enabled: true, dropped: 0, events: [] });
});
