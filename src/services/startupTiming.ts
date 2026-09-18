export type StartupTimingStage = {
  durationMs: number;
  failed?: boolean;
};

export type StartupTimingReport = {
  event: "db-initialization" | "app-shell-ready";
  totalMs: number;
  initialImport?: boolean;
  failedStage?: string;
  error?: string;
  stages?: Record<string, StartupTimingStage>;
  imageHydration?: {
    imageReferences: number;
    hydratedImages: number;
    updatedRows: number;
    assetResolutionWorkerMs: number;
    fileCopyWorkerMs: number;
    databaseUpdateWorkerMs: number;
  };
};

type Clock = () => number;

const defaultClock: Clock = () => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
};

export const isStartupTimingEnabled = (): boolean =>
  process.env.EXPO_PUBLIC_STARTUP_TIMING === "1";

export const isInitialDatabaseImport = (databaseExists: boolean): boolean =>
  !databaseExists;

export const toFileSystemUri = (path: string): string =>
  path.startsWith("file://") ? path : `file://${path}`;

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export class StartupTimer {
  private readonly startedAt: number;
  private readonly stages: Record<string, StartupTimingStage> = {};

  constructor(private readonly clock: Clock = defaultClock) {
    this.startedAt = clock();
  }

  async measure<T>(name: string, work: () => Promise<T>): Promise<T> {
    const startedAt = this.clock();
    let didFail = false;
    try {
      return await work();
    } catch (error) {
      didFail = true;
      this.record(name, this.elapsedSince(startedAt), true);
      throw error;
    } finally {
      if (!didFail) {
        this.record(name, this.elapsedSince(startedAt));
      }
    }
  }

  elapsedMs(): number {
    return this.elapsedSince(this.startedAt);
  }

  snapshot(): Record<string, StartupTimingStage> {
    return { ...this.stages };
  }

  private elapsedSince(startedAt: number): number {
    return Math.max(0, Math.round(this.clock() - startedAt));
  }

  private record(name: string, durationMs: number, failed = false): void {
    const previous = this.stages[name];
    this.stages[name] = {
      durationMs: (previous?.durationMs ?? 0) + durationMs,
      ...(previous?.failed || failed ? { failed: true } : {}),
    };
  }
}

export const logStartupTiming = (report: StartupTimingReport): void => {
  if (!isStartupTimingEnabled()) {
    return;
  }
  console.info("[StartupTiming]", JSON.stringify(report));
};
