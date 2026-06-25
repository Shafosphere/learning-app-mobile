import { useCallback, useState } from "react";
import type { MutableRefObject } from "react";

export type UseReviewMutationQueueParams = {
  reviewMutationQueueRef: MutableRefObject<Map<number, Promise<unknown>>>;
};

export const useReviewMutationQueue = ({
  reviewMutationQueueRef,
}: UseReviewMutationQueueParams) => {
  const [, setQueueVersion] = useState(0);
  const bumpQueueVersion = useCallback(() => {
    setQueueVersion((version) => version + 1);
  }, []);

  const enqueueReviewMutation = useCallback(
    <T,>(cardId: number, operation: () => Promise<T>): Promise<T> => {
      const prior =
        reviewMutationQueueRef.current.get(cardId) ?? Promise.resolve();
      const queued = prior.catch(() => undefined).then(operation);
      reviewMutationQueueRef.current.set(cardId, queued);
      bumpQueueVersion();
      void queued
        .finally(() => {
          if (reviewMutationQueueRef.current.get(cardId) === queued) {
            reviewMutationQueueRef.current.delete(cardId);
            bumpQueueVersion();
          }
        })
        .catch(() => undefined);
      return queued;
    },
    [bumpQueueVersion, reviewMutationQueueRef]
  );

  const hasPendingMutation = useCallback(
    (cardId: number) => reviewMutationQueueRef.current.has(cardId),
    [reviewMutationQueueRef]
  );

  return { enqueueReviewMutation, hasPendingMutation };
};
