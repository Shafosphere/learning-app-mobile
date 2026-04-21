import { REVIEW_INTERVAL_RANGES_MS } from "@/src/config/appConfig";
import { computeNextReviewFromStage } from "@/src/db/sqlite/utils";

describe("computeNextReviewFromStage", () => {
  const nowMs = 1_700_000_000_000;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(REVIEW_INTERVAL_RANGES_MS.map((range, stage) => [stage, range] as const))(
    "returns a timestamp inside the configured range for stage %s",
    (stage, [minMs, maxMs]) => {
      jest.spyOn(Math, "random").mockReturnValue(0.5);

      const nextReview = computeNextReviewFromStage(stage, nowMs);

      expect(nextReview).toBeGreaterThanOrEqual(nowMs + minMs);
      expect(nextReview).toBeLessThanOrEqual(nowMs + maxMs);
    }
  );

  it("clamps stages below the configured range", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);

    const nextReview = computeNextReviewFromStage(-3, nowMs);

    expect(nextReview).toBe(nowMs + REVIEW_INTERVAL_RANGES_MS[0][0]);
  });

  it("clamps stages above the configured range to the highest review box", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.999999);

    const nextReview = computeNextReviewFromStage(99, nowMs);

    expect(nextReview).toBeGreaterThanOrEqual(nowMs + REVIEW_INTERVAL_RANGES_MS[5][0]);
    expect(nextReview).toBeLessThanOrEqual(nowMs + REVIEW_INTERVAL_RANGES_MS[5][1]);
  });
});
