import { AppState } from "react-native";
import { playAssetDelivery, type NativePackState } from "@/Audio/modules/play-asset-delivery";
import { getContentPack } from "./catalog";
import { usesImagePAD } from "./generated/bundledImages";
import { appendDebugEvent } from "@/src/services/debugEvents";
import { recordCourseActivationEvent } from "@/src/services/courseActivationDiagnostics";

// Older development clients need a rebuild for the v2 readiness method.
const nativeDelivery = typeof playAssetDelivery?.checkPackReady === "function" ? playAssetDelivery : null;

export type DownloadPhase = "checking" | "unavailable" | "missing" | "pending" | "downloading" | "transferring" | "ready" | "confirmation" | "cancelled" | "failed";
export type PackDownload = {
  name: string;
  phase: DownloadPhase;
  totalBytes: number;
  downloadedBytes: number;
  errorCode: number;
  nativeStatus: number | null;
  confirmationReason: "wifi" | "play" | null;
  confirmationPending: boolean;
};
const snapshots: Record<string, PackDownload> = {};
const listeners = new Set<() => void>();
const revisions: Record<string, number> = {};
const refreshes = new Map<string, Promise<void>>();
// Preview missing native support and bundled images in development.
// This changes UI state only; file resolution still uses real platform assets.
const developmentPreview = (name: string) => __DEV__ && (!nativeDelivery || (getContentPack(name)?.kind === "images" && !usesImagePAD));
const previewTimers = new Map<string, ReturnType<typeof setTimeout>>();
let confirmationInFlight: Promise<void> | null = null;
let started = false;
const emit = () => listeners.forEach((listener) => listener());
const missing = (name: string): PackDownload => ({ name,
  phase: developmentPreview(name) && getContentPack(name) ? "missing" : nativeDelivery ? "checking" : "unavailable",
  totalBytes: getContentPack(name)?.sourceBytes ?? 0,
  downloadedBytes: 0, errorCode: 0, nativeStatus: null, confirmationReason: null, confirmationPending: false });
export function getPackDownload(name: string): PackDownload {
  return snapshots[name] ?? (snapshots[name] = missing(name));
}
function setState(name: string, patch: Partial<PackDownload>) {
  const previous = getPackDownload(name);
  const next = { ...previous, ...patch };
  if (patch.phase && patch.phase !== "confirmation") next.confirmationReason = null;
  // Native refreshes can repeat the same state. Preserve snapshot identity and
  // avoid waking every course subscriber, including collapsed panels.
  if ((Object.keys(next) as (keyof PackDownload)[]).every((key) => Object.is(previous[key], next[key]))) return;
  snapshots[name] = next;
  recordCourseActivationEvent("pack.state", { pack: name, phase: next.phase, downloadedBytes: next.downloadedBytes });
  emit();
}
function diagnostic(name: string, event: string, details: Record<string, unknown> = {}) {
  const state = getPackDownload(name);
  const payload = { pack: name, nativeStatus: state.nativeStatus, phase: state.phase,
    errorCode: state.errorCode, ...details, preview: developmentPreview(name) };
  console.info("[PAD]", { event, ...payload });
  void appendDebugEvent("pad", event, payload);
}
function errorCode(error: unknown) {
  const code = (error as { code?: string })?.code;
  return code?.startsWith("PAD_") ? Number(code.slice(4)) || 0 : 0;
}
type Readiness = { epoch: number; available?: boolean; pending?: Promise<boolean> };
const readiness = new Map<string, Readiness>();
const readinessEpochs: Record<string, number> = {};
function invalidateReadiness(name: string) {
  readinessEpochs[name] = (readinessEpochs[name] ?? 0) + 1;
  readiness.delete(name);
}
async function ready(name: string): Promise<boolean> {
  const pack = getContentPack(name), native = nativeDelivery;
  if (!native || !pack) return false;
  const epoch = readinessEpochs[name] ?? 0;
  const existing = readiness.get(name);
  if (existing?.pending) return existing.pending;
  if (existing?.available === true) return true;
  const entry: Readiness = { epoch };
  const pending = native.checkPackReady(name, pack.manifestHash).then((available) => {
    if ((readinessEpochs[name] ?? 0) === epoch && readiness.get(name) === entry) entry.available = available;
    return available;
  }).finally(() => { entry.pending = undefined; });
  entry.pending = pending;
  readiness.set(name, entry);
  return pending;
}
async function applyNativeState(state: NativePackState) {
  const { name } = state;
  if (developmentPreview(name)) return;
  if (!getContentPack(name)) return;
  invalidateReadiness(name);
  const revision = revisions[name] = (revisions[name] ?? 0) + 1;
  const phases: Record<number, DownloadPhase> = { 1: "pending", 2: "downloading", 3: "transferring", 4: "transferring",
    5: "failed", 6: "cancelled", 7: "confirmation", 8: "missing", 9: "confirmation" };
  setState(name, { phase: phases[state.status] ?? "missing", downloadedBytes: state.downloadedBytes,
    totalBytes: state.totalBytes > 0 ? state.totalBytes : getPackDownload(name).totalBytes || getContentPack(name)!.sourceBytes, errorCode: state.errorCode, nativeStatus: state.status,
    confirmationReason: state.status === 7 ? "wifi" : state.status === 9 ? "play" : null });
  diagnostic(name, "state", { downloadedBytes: state.downloadedBytes, totalBytes: state.totalBytes });
  if (state.status === 4) {
    try {
      const available = await ready(name);
      if (revisions[name] === revision) setState(name, { phase: available ? "ready" : "failed" });
    } catch (error) {
      if (revisions[name] === revision) setState(name, { phase: "failed", errorCode: errorCode(error) });
    }
  }
}
export function refreshPack(name: string): Promise<void> {
  if (developmentPreview(name) || !nativeDelivery || !getContentPack(name)) return Promise.resolve();
  start();
  const existing = refreshes.get(name);
  if (existing) {
    recordCourseActivationEvent("pack.refresh.join", { pack: name });
    return existing;
  }
  invalidateReadiness(name);
  recordCourseActivationEvent("pack.refresh.start", { pack: name });
  const pending = refreshCurrentPack(name).finally(() => {
    refreshes.delete(name);
    recordCourseActivationEvent("pack.refresh.end", { pack: name });
  });
  refreshes.set(name, pending);
  return pending;
}
async function refreshCurrentPack(name: string) {
  if (!nativeDelivery) return;
  const revision = revisions[name] ?? 0;
  try {
    if (await ready(name)) {
      if ((revisions[name] ?? 0) === revision) setState(name, { phase: "ready", errorCode: 0 });
    } else {
      const states = await nativeDelivery.getPackStates([name]);
      if ((revisions[name] ?? 0) === revision) await Promise.all(states.map(applyNativeState));
    }
  } catch (error) {
    if ((revisions[name] ?? 0) === revision) {
      setState(name, { phase: "failed", errorCode: errorCode(error) });
      diagnostic(name, "refreshFailed");
    }
  }
}
function start() {
  if (started) return;
  started = true;
  nativeDelivery?.addListener("onPackState", (state) => { void applyNativeState(state); });
  AppState.addEventListener("change", (state) => {
    if (state === "active") Object.keys(snapshots).forEach((name) => {
      revisions[name] = (revisions[name] ?? 0) + 1;
      invalidateReadiness(name);
      const pending = refreshes.get(name);
      if (pending) void pending.then(() => refreshPack(name));
      else void refreshPack(name);
    });
  });
}
export function subscribePackDownloads(listener: () => void) {
  start();
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function previewDownload(name: string) {
  if (previewTimers.has(name) || getPackDownload(name).phase === "ready") return;
  const revision = revisions[name] = (revisions[name] ?? 0) + 1;
  const totalBytes = getContentPack(name)!.sourceBytes;
  setState(name, { phase: "pending", downloadedBytes: 0, totalBytes, errorCode: 0 });
  diagnostic(name, "previewStarted", { preview: true });
  const steps: { phase: DownloadPhase; fraction: number }[] = [
    { phase: "downloading", fraction: 0.2 }, { phase: "downloading", fraction: 0.4 },
    { phase: "downloading", fraction: 0.6 }, { phase: "downloading", fraction: 0.8 },
    { phase: "downloading", fraction: 1 }, { phase: "transferring", fraction: 1 },
    { phase: "ready", fraction: 1 },
  ];
  const schedule = (index: number) => {
    previewTimers.set(name, setTimeout(() => {
      previewTimers.delete(name);
      if (revisions[name] !== revision) return;
      const step = steps[index];
      setState(name, { phase: step.phase, downloadedBytes: Math.ceil(totalBytes * step.fraction) });
      if (index + 1 < steps.length) schedule(index + 1);
    }, 650));
  };
  schedule(0);
}
export async function downloadPack(name: string) {
  return requestPack(name);
}
async function requestPack(name: string, confirmed = false) {
  if (!getContentPack(name)) return;
  const state = getPackDownload(name);
  if ((!confirmed && (state.confirmationPending || state.phase === "confirmation")) || ["pending", "downloading", "transferring", "ready"].includes(state.phase)) return;
  if (developmentPreview(name)) { start(); previewDownload(name); return; }
  if (!nativeDelivery) return;
  start();
  const revision = revisions[name] = (revisions[name] ?? 0) + 1;
  setState(name, { phase: "pending", errorCode: 0 });
  diagnostic(name, "downloadRequested");
  try {
    const states = await nativeDelivery.fetch([name]);
    if (revisions[name] === revision) await Promise.all(states.map(applyNativeState));
  } catch (error) {
    if (revisions[name] === revision) {
      setState(name, { phase: "failed", errorCode: errorCode(error) });
      diagnostic(name, "downloadFailed");
    }
  }
}
export async function cancelPack(name: string) {
  const revision = revisions[name] = (revisions[name] ?? 0) + 1;
  if (developmentPreview(name) && getContentPack(name)) {
    const timer = previewTimers.get(name);
    if (timer) clearTimeout(timer);
    previewTimers.delete(name);
    setState(name, { phase: "cancelled" });
    return;
  }
  try {
    if (nativeDelivery) {
      const states = await nativeDelivery.cancel([name]);
      if (revisions[name] === revision) await Promise.all(states.map(applyNativeState));
    }
  } catch (error) {
    if (revisions[name] === revision) setState(name, { phase: "failed", errorCode: errorCode(error) });
  }
}
export function confirmPackDownload(name: string): Promise<void> {
  if (developmentPreview(name) || !nativeDelivery || !getContentPack(name)) return Promise.resolve();
  if (confirmationInFlight) return confirmationInFlight;
  const expectedReason = getPackDownload(name).confirmationReason;
  setState(name, { confirmationPending: true });
  confirmationInFlight = confirmCurrentPack(name, expectedReason).finally(() => {
    confirmationInFlight = null;
    setState(name, { confirmationPending: false });
  });
  return confirmationInFlight;
}
async function confirmCurrentPack(name: string, expectedReason: PackDownload["confirmationReason"]) {
  if (!nativeDelivery) return;
  try {
    // Recheck native state; a stale button must not open Play after completion.
    await refreshPack(name);
    const revision = revisions[name] ?? 0;
    const state = getPackDownload(name);
    if (state.phase !== "confirmation" || ![7, 9].includes(state.nativeStatus ?? 0)) {
      diagnostic(name, "confirmationSkipped", { reason: state.phase });
      return;
    }
    if (expectedReason && state.confirmationReason !== expectedReason) {
      // A transfer-consent tap must not silently become a Play-installation tap.
      diagnostic(name, "confirmationSkipped", { reason: "confirmationReasonChanged" });
      return;
    }
    const available = await ready(name);
    if (available) {
      if ((revisions[name] ?? 0) === revision) setState(name, { phase: "ready", errorCode: 0 });
      diagnostic(name, "confirmationSkipped", { reason: "ready" });
      return;
    }
    if ((revisions[name] ?? 0) !== revision || getPackDownload(name).phase !== "confirmation") {
      diagnostic(name, "confirmationSkipped", { reason: "stateChanged" });
      return;
    }
    diagnostic(name, "confirmationDialogRequested", { reason: state.confirmationReason });
    const accepted = await nativeDelivery.showConfirmationDialog();
    diagnostic(name, "confirmationDialogResult", { accepted });
    await refreshPack(name);
    if (accepted && getPackDownload(name).phase !== "ready") await requestPack(name, true);
  } catch (error) {
    setState(name, { phase: "failed", errorCode: errorCode(error) });
    diagnostic(name, "confirmationFailed");
  }
}
