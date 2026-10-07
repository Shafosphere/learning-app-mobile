// Keep call sites available for targeted local diagnostics without emitting
// scroll trace events during normal app use.
export const ENABLE_FLASHCARDS_SCROLL_CONSOLE_LOGS = false;

export function logFlashcardsScrollDebug(
  _event: string,
  _payload: Record<string, unknown>,
) {
  // Intentionally disabled; retain call sites for quick local diagnostics.
}
