import { useCallback, useEffect, useRef, useState } from "react";
import type { DbInitializationEvent } from "@/src/db/sqlite/core";

const INITIAL_MESSAGE = "app.loading.initializing";
const UPDATE_MESSAGES = [
  "app.loading.newVersion",
  "app.loading.updatingFlashcards",
] as const;

export function useStartupLoadingMessage() {
  const [loadingMessageKey, setLoadingMessageKey] = useState(INITIAL_MESSAGE);
  const rotationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopStartupMessageRotation = useCallback(() => {
    if (rotationTimerRef.current !== null) {
      clearInterval(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }
  }, []);

  const resetStartupMessage = useCallback(() => {
    stopStartupMessageRotation();
    setLoadingMessageKey(INITIAL_MESSAGE);
  }, [stopStartupMessageRotation]);

  const handleStartupMessageEvent = useCallback((event: DbInitializationEvent) => {
    switch (event.type) {
      case "start":
        resetStartupMessage();
        break;
      case "import-start":
        setLoadingMessageKey("app.loading.importingCsv");
        break;
      case "import-finish":
        setLoadingMessageKey("app.loading.finishingSetup");
        break;
      case "content-update-detected": {
        if (rotationTimerRef.current !== null) return;
        let messageIndex = 0;
        setLoadingMessageKey(UPDATE_MESSAGES[messageIndex]);
        rotationTimerRef.current = setInterval(() => {
          messageIndex = (messageIndex + 1) % UPDATE_MESSAGES.length;
          setLoadingMessageKey(UPDATE_MESSAGES[messageIndex]);
        }, 2000);
        break;
      }
      case "ready":
        stopStartupMessageRotation();
        setLoadingMessageKey("app.loading.launching");
        break;
      case "error":
        stopStartupMessageRotation();
        setLoadingMessageKey("app.loading.dbError");
        break;
    }
  }, [resetStartupMessage, stopStartupMessageRotation]);

  useEffect(() => stopStartupMessageRotation, [stopStartupMessageRotation]);

  return {
    loadingMessageKey,
    handleStartupMessageEvent,
    resetStartupMessage,
    stopStartupMessageRotation,
  };
}
