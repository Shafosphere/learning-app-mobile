import { runWithConcurrency } from "@/src/utils/runWithConcurrency";

describe("runWithConcurrency", () => {
  it("limits active work and preserves input order", async () => {
    let active = 0;
    let peak = 0;
    const results = await runWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active -= 1;
      return value * 2;
    });

    expect(peak).toBeLessThanOrEqual(2);
    expect(results).toEqual([2, 4, 6, 8, 10]);
  });

  it("rejects invalid worker limits", async () => {
    await expect(runWithConcurrency([], 0, async () => 1)).rejects.toThrow(
      "Concurrency must be at least 1."
    );
  });
});
