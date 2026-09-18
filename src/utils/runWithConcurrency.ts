export async function runWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("Concurrency must be at least 1.");
  }

  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const runWorker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  };

  const settled = await Promise.allSettled(
    Array.from({ length: Math.min(concurrency, items.length) }, runWorker)
  );
  const failed = settled.find(
    (result): result is PromiseRejectedResult => result.status === "rejected"
  );
  if (failed) {
    throw failed.reason;
  }
  return results;
}
