import { useEffect, useRef } from "react";

type InteractionState = {
  id: number;
  targetCourseId: number;
  startedAt: number;
  committedAt?: number;
  highlightedAt?: number;
  summaryTimer: ReturnType<typeof setTimeout> | null;
  renderCounts: Map<string, number>;
};

const PROFILE_PREFIX = "[CourseActivateProfile]";
const SUMMARY_DELAY_MS = 250;

let nextInteractionId = 1;
let activeInteraction: InteractionState | null = null;

function isEnabled() {
  return typeof __DEV__ !== "undefined" && __DEV__;
}

function clearSummaryTimer(interaction: InteractionState | null) {
  if (interaction?.summaryTimer) {
    clearTimeout(interaction.summaryTimer);
    interaction.summaryTimer = null;
  }
}

function summarizeInteraction(interaction: InteractionState) {
  const totalMs = Date.now() - interaction.startedAt;
  const renderSummary = Array.from(interaction.renderCounts.entries())
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([name, count]) => `${name}=${count}`)
    .join(", ");

  console.log(
    `${PROFILE_PREFIX} #${interaction.id} summary after ${totalMs}ms: ${renderSummary || "no renders tracked"}`,
  );
}

function scheduleSummary(interaction: InteractionState) {
  clearSummaryTimer(interaction);
  interaction.summaryTimer = setTimeout(() => {
    if (activeInteraction?.id !== interaction.id) {
      return;
    }
    summarizeInteraction(interaction);
    activeInteraction = null;
  }, SUMMARY_DELAY_MS);
}

export function beginCourseHighlightProfile(targetCourseId: number) {
  if (!isEnabled()) {
    return;
  }

  clearSummaryTimer(activeInteraction);
  activeInteraction = {
    id: nextInteractionId++,
    targetCourseId,
    startedAt: Date.now(),
    summaryTimer: null,
    renderCounts: new Map(),
  };

  console.log(
    `${PROFILE_PREFIX} #${activeInteraction.id} press course=${targetCourseId}`,
  );
}

export function markCourseHighlightCommitted(targetCourseId: number) {
  if (!isEnabled()) {
    return;
  }

  if (
    !activeInteraction ||
    activeInteraction.targetCourseId !== targetCourseId ||
    activeInteraction.committedAt
  ) {
    return;
  }

  activeInteraction.committedAt = Date.now();
  console.log(
    `${PROFILE_PREFIX} #${activeInteraction.id} committed after ${activeInteraction.committedAt - activeInteraction.startedAt}ms`,
  );
}

export function markCourseHighlightVisible(targetCourseId: number) {
  if (!isEnabled()) {
    return;
  }

  if (
    !activeInteraction ||
    activeInteraction.targetCourseId !== targetCourseId ||
    activeInteraction.highlightedAt
  ) {
    return;
  }

  requestAnimationFrame(() => {
    if (
      !activeInteraction ||
      activeInteraction.targetCourseId !== targetCourseId ||
      activeInteraction.highlightedAt
    ) {
      return;
    }

    activeInteraction.highlightedAt = Date.now();
    console.log(
      `${PROFILE_PREFIX} #${activeInteraction.id} highlight visible after ${activeInteraction.highlightedAt - activeInteraction.startedAt}ms`,
    );
    scheduleSummary(activeInteraction);
  });
}

export function useCourseActivateProfileRender(
  componentName: string,
  details?: string,
) {
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  useEffect(() => {
    if (!isEnabled() || !componentName) {
      return;
    }

    const suffix = details ? ` ${details}` : "";
    console.log(
      `${PROFILE_PREFIX} render ${componentName}#${renderCountRef.current}${suffix}`,
    );

    if (!activeInteraction) {
      return;
    }

    const currentCount =
      (activeInteraction.renderCounts.get(componentName) ?? 0) + 1;
    activeInteraction.renderCounts.set(componentName, currentCount);
    console.log(
      `${PROFILE_PREFIX} #${activeInteraction.id} during interaction: ${componentName}=${currentCount}${suffix}`,
    );
  });
}
