import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";
import { AppState, type AppStateStatus } from "react-native";

import {
  computeDueReviewCount,
  DueReviewsProvider,
  useDueReviews,
} from "@/src/contexts/DueReviewsContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import {
  countDueCustomReviews,
  getCustomCoursesWithCardCounts,
} from "@/src/db/sqlite/db";

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("@/src/db/sqlite/db", () => ({
  countDueCustomReviews: jest.fn(),
  getCustomCoursesWithCardCounts: jest.fn(),
}));

const mockedUseSettings = useSettings as jest.MockedFunction<typeof useSettings>;
const mockedCountDueCustomReviews =
  countDueCustomReviews as jest.MockedFunction<typeof countDueCustomReviews>;
const mockedGetCustomCoursesWithCardCounts =
  getCustomCoursesWithCardCounts as jest.MockedFunction<
    typeof getCustomCoursesWithCardCounts
  >;

describe("DueReviewsContext", () => {
  const appStateListeners: Array<(state: AppStateStatus) => void> = [];
  let pinnedOfficialCourseIds: number[];

  beforeEach(() => {
    jest.clearAllMocks();
    appStateListeners.length = 0;
    pinnedOfficialCourseIds = [2];
    mockedUseSettings.mockReturnValue({
      pinnedOfficialCourseIds,
    } as ReturnType<typeof useSettings>);
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

    jest.spyOn(AppState, "addEventListener").mockImplementation(
      (_type, listener) => {
        appStateListeners.push(listener);
        return {
          remove: jest.fn(),
        };
      },
    );
  });

  it("counts only enabled courses and pinned official courses", async () => {
    await expect(computeDueReviewCount([2], 123)).resolves.toBe(10);
    expect(mockedGetCustomCoursesWithCardCounts).toHaveBeenCalledTimes(1);
    expect(mockedCountDueCustomReviews).toHaveBeenCalledTimes(2);
    expect(mockedCountDueCustomReviews).toHaveBeenCalledWith(1, 123);
    expect(mockedCountDueCustomReviews).toHaveBeenCalledWith(2, 123);
  });

  it("refreshes on mount and when the app returns to active state", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DueReviewsProvider>{children}</DueReviewsProvider>
    );

    const { result } = renderHook(() => useDueReviews(), { wrapper });

    await waitFor(() => {
      expect(result.current.dueReviewCount).toBe(10);
      expect(result.current.lastRefreshedAt).not.toBeNull();
    });

    mockedCountDueCustomReviews.mockImplementation(async (courseId: number) => {
      if (courseId === 1) return 1;
      if (courseId === 2) return 2;
      return 0;
    });

    await act(async () => {
      appStateListeners.forEach((listener) => listener("active"));
    });

    await waitFor(() => {
      expect(result.current.dueReviewCount).toBe(3);
    });
  });

  it("queues another refresh when settings change mid-refresh", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DueReviewsProvider>{children}</DueReviewsProvider>
    );
    let releaseFirstCount: (() => void) | null = null;
    const firstCountPromise = new Promise<number>((resolve) => {
      releaseFirstCount = () => resolve(7);
    });

    mockedCountDueCustomReviews.mockImplementation((courseId: number) => {
      if (courseId === 1) {
        return Promise.resolve(3);
      }
      if (courseId === 2) {
        return firstCountPromise;
      }
      return Promise.resolve(0);
    });

    const { result, rerender } = renderHook(() => useDueReviews(), { wrapper });

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(true);
    });

    mockedCountDueCustomReviews.mockImplementation(async (courseId: number) => {
      if (courseId === 1) {
        return 3;
      }
      return 0;
    });
    pinnedOfficialCourseIds = [];
    mockedUseSettings.mockReturnValue({
      pinnedOfficialCourseIds,
    } as ReturnType<typeof useSettings>);

    rerender({});

    await act(async () => {
      releaseFirstCount?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.dueReviewCount).toBe(3);
    });

    expect(mockedCountDueCustomReviews).toHaveBeenCalledWith(2, expect.any(Number));
    expect(mockedCountDueCustomReviews).toHaveBeenLastCalledWith(
      1,
      expect.any(Number),
    );
  });
});
