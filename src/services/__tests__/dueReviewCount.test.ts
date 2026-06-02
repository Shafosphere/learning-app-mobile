import { countDueReviewsAt } from "@/src/services/dueReviewCount";
import {
  countDueCustomReviews,
  getCustomCoursesWithCardCounts,
} from "@/src/db/sqlite/db";

jest.mock("@/src/db/sqlite/db", () => ({
  countDueCustomReviews: jest.fn(),
  getCustomCoursesWithCardCounts: jest.fn(),
}));

const mockedCountDueCustomReviews =
  countDueCustomReviews as jest.MockedFunction<typeof countDueCustomReviews>;
const mockedGetCustomCoursesWithCardCounts =
  getCustomCoursesWithCardCounts as jest.MockedFunction<
    typeof getCustomCoursesWithCardCounts
  >;

describe("due review count", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCustomCoursesWithCardCounts.mockResolvedValue([
      { id: 1, reviewsEnabled: true, isOfficial: false },
      { id: 2, reviewsEnabled: true, isOfficial: true },
      { id: 3, reviewsEnabled: true, isOfficial: true },
      { id: 4, reviewsEnabled: false, isOfficial: false },
    ] as Awaited<ReturnType<typeof getCustomCoursesWithCardCounts>>);
    mockedCountDueCustomReviews.mockImplementation(async (courseId: number) => {
      if (courseId === 1) return 3;
      if (courseId === 2) return 7;
      if (courseId === 3) return 11;
      return 0;
    });
  });

  it("counts enabled custom courses and pinned official courses at the requested time", async () => {
    await expect(countDueReviewsAt([2], 123)).resolves.toBe(10);

    expect(mockedCountDueCustomReviews).toHaveBeenCalledTimes(2);
    expect(mockedCountDueCustomReviews).toHaveBeenCalledWith(1, 123);
    expect(mockedCountDueCustomReviews).toHaveBeenCalledWith(2, 123);
  });

  it("treats a failed course count as zero", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockedCountDueCustomReviews.mockImplementation(async (courseId: number) => {
      if (courseId === 1) {
        throw new Error("db failed");
      }
      if (courseId === 2) {
        return 7;
      }
      return 0;
    });

    await expect(countDueReviewsAt([2], 456)).resolves.toBe(7);
    warnSpy.mockRestore();
  });
});
