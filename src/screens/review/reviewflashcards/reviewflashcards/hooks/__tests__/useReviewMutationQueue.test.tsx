import { act, renderHook } from "@testing-library/react-native";

import { useReviewMutationQueue } from "../useReviewMutationQueue";

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe("useReviewMutationQueue", () => {
  it("serializes operations for the same card", async () => {
    const reviewMutationQueueRef = {
      current: new Map<number, Promise<unknown>>(),
    };
    const events: string[] = [];
    let resolveFirst: (value: string) => void = () => {};
    const firstOperation = new Promise<string>((resolve) => {
      resolveFirst = resolve;
    });
    const { result } = renderHook(() =>
      useReviewMutationQueue({ reviewMutationQueueRef })
    );

    const first = result.current.enqueueReviewMutation(1, () => {
      events.push("first:start");
      return firstOperation;
    });
    const second = result.current.enqueueReviewMutation(1, async () => {
      events.push("second:start");
      return "second";
    });

    await flushPromises();
    expect(events).toEqual(["first:start"]);

    resolveFirst("first");
    await expect(first).resolves.toBe("first");
    await expect(second).resolves.toBe("second");
    expect(events).toEqual(["first:start", "second:start"]);
  });

  it("continues after failures and cleans up the latest queued operation", async () => {
    const reviewMutationQueueRef = {
      current: new Map<number, Promise<unknown>>(),
    };
    const { result } = renderHook(() =>
      useReviewMutationQueue({ reviewMutationQueueRef })
    );

    const first = result.current.enqueueReviewMutation(2, async () => {
      throw new Error("boom");
    });
    const second = result.current.enqueueReviewMutation(2, async () => "ok");

    await expect(first).rejects.toThrow("boom");
    await expect(second).resolves.toBe("ok");
    await flushPromises();
    expect(reviewMutationQueueRef.current.has(2)).toBe(false);
  });

  it("does not block different cards behind each other", async () => {
    const reviewMutationQueueRef = {
      current: new Map<number, Promise<unknown>>(),
    };
    const events: string[] = [];
    let resolveFirst: (value: string) => void = () => {};
    const firstOperation = new Promise<string>((resolve) => {
      resolveFirst = resolve;
    });
    const { result } = renderHook(() =>
      useReviewMutationQueue({ reviewMutationQueueRef })
    );

    const first = result.current.enqueueReviewMutation(3, () => {
      events.push("first:start");
      return firstOperation;
    });
    const second = result.current.enqueueReviewMutation(4, async () => {
      events.push("second:start");
      return "second";
    });

    await expect(second).resolves.toBe("second");
    expect(events).toEqual(["first:start", "second:start"]);

    resolveFirst("first");
    await expect(first).resolves.toBe("first");
  });

  it("reports pending mutations and re-renders when queue state changes", async () => {
    const reviewMutationQueueRef = {
      current: new Map<number, Promise<unknown>>(),
    };
    let resolveOperation: (value: string) => void = () => {};
    const operation = new Promise<string>((resolve) => {
      resolveOperation = resolve;
    });
    const { result } = renderHook(() =>
      useReviewMutationQueue({ reviewMutationQueueRef })
    );

    let queued: Promise<string>;
    act(() => {
      queued = result.current.enqueueReviewMutation(5, () => operation);
    });

    expect(result.current.hasPendingMutation(5)).toBe(true);
    expect(result.current.hasPendingMutation(6)).toBe(false);

    await act(async () => {
      resolveOperation("done");
      await queued;
      await flushPromises();
    });

    expect(result.current.hasPendingMutation(5)).toBe(false);
  });
});
