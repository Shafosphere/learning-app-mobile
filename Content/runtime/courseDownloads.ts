import { getCourseImagePacks, getContentPack } from "./catalog";
import { recordCourseActivationEvent } from "@/src/services/courseActivationDiagnostics";
import { cancelPack, confirmPackDownload, downloadPack, getPackDownload, refreshPack, type PackDownload } from "./packDownloads";

export type CourseDownload = PackDownload & { confirmationPack: string | null };
const cached = new Map<string, { states: PackDownload[]; targets: string[] | undefined; snapshot: CourseDownload }>();
const targets = new Map<string, string[]>();
const requests = new Map<string, Promise<void>>();
const required = (slug: string) => getCourseImagePacks(slug);
const active = (state: PackDownload) => ["pending", "downloading", "transferring"].includes(state.phase);

export function getCourseDownload(slug: string): CourseDownload {
  const names = required(slug), states = names.map(getPackDownload);
  let batch = targets.get(slug);
  const previous = cached.get(slug);
  if (previous && previous.targets === batch && previous.states.length === states.length && states.every((state, index) => previous.states[index] === state)) return previous.snapshot;
  const unfinished = states.filter((state) => state.phase !== "ready");
  const confirmation = unfinished.find((state) => state.phase === "confirmation");
  const busy = unfinished.find((state) => state.phase === "downloading")
    ?? unfinished.find((state) => state.phase === "transferring") ?? unfinished.find((state) => state.phase === "pending");
  if (busy && (!batch || unfinished.some((state) => active(state) && !batch!.includes(state.name)))) {
    batch = unfinished.map((state) => state.name);
    targets.set(slug, batch);
  }
  const representative = confirmation ?? busy ?? unfinished.find((state) => state.phase === "checking")
    ?? unfinished.find((state) => state.phase === "failed") ?? unfinished.find((state) => state.phase === "unavailable")
    ?? unfinished.find((state) => state.phase === "cancelled") ?? unfinished[0];
  // Keep the denominator stable while members of this download finish.
  const progressStates = busy && batch ? states.filter((state) => batch.includes(state.name)) : unfinished;
  const size = (state: PackDownload) => state.totalBytes > 0 ? state.totalBytes : getContentPack(state.name)?.sourceBytes ?? 0;
  const snapshot: CourseDownload = {
    name: slug, phase: representative?.phase ?? (names.length ? "ready" : "unavailable"),
    totalBytes: (unfinished.length ? progressStates : states).reduce((sum, state) => sum + size(state), 0),
    downloadedBytes: progressStates.reduce((sum, state) => sum + (state.phase === "ready" ? size(state) : Math.min(state.downloadedBytes, size(state))), 0),
    errorCode: representative?.errorCode ?? 0, nativeStatus: representative?.nativeStatus ?? null,
    confirmationReason: confirmation?.confirmationReason ?? null, confirmationPack: confirmation?.name ?? null,
    confirmationPending: states.some((state) => state.confirmationPending),
  };
  cached.set(slug, { states, targets: batch, snapshot });
  return snapshot;
}
export async function refreshCourse(slug: string) {
  recordCourseActivationEvent("course.refresh.start", { slug });
  try {
    await Promise.all(required(slug).map(refreshPack));
  } finally {
    recordCourseActivationEvent("course.refresh.end", { slug });
  }
}
export function downloadCourse(slug: string): Promise<void> {
  const existing = requests.get(slug);
  if (existing) return existing;
  const request = (async () => {
    await refreshCourse(slug);
    const missing = required(slug).filter((name) => getPackDownload(name).phase !== "ready");
    targets.set(slug, missing);
    await Promise.all(missing.filter((name) => !active(getPackDownload(name)) && getPackDownload(name).phase !== "confirmation").map(downloadPack));
  })().finally(() => { requests.delete(slug); });
  requests.set(slug, request);
  return request;
}
export async function cancelCourse(slug: string) {
  await Promise.all(required(slug).filter((name) => active(getPackDownload(name))).map(cancelPack));
}
export async function confirmCourseDownload(slug: string) {
  // Capture the displayed reason before the asynchronous native refresh.
  const pack = getCourseDownload(slug).confirmationPack;
  if (pack) await confirmPackDownload(pack);
}
