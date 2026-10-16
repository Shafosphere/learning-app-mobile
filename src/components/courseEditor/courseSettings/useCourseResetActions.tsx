import { useCallback, useMemo, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NudgeModal } from "@/src/components/nudge/NudgeModal";

export type CourseResetKey = "settings" | "boxes" | "reviews" | "all";
type Options = {
  scopeKey: string | number;
  disabled?: boolean;
  onResetSettings: () => Promise<void>;
  onResetBoxes: () => Promise<void>;
  onResetReviews: () => Promise<number>;
  onResetAll: () => Promise<void>;
};
type Dialog = {
  key: CourseResetKey;
  phase: "confirm" | "working" | "done" | "error";
  count?: number;
};
const keys: CourseResetKey[] = ["settings", "boxes", "reviews", "all"];
const prefixes = { boxes: "resetBoxes", reviews: "resetReviews", all: "resetAll" };
const base = "courseCreator.customEditor";

export function useCourseResetActions(options: Options) {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const busy = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    generation.current += 1;
    setDialog(null);
    return () => { generation.current += 1; };
  }, [options.scopeKey]);

  const close = () => {
    if (!busy.current) setDialog(null);
  };
  const text = (key: CourseResetKey, suffix: string) =>
    key === "settings"
      ? t(`courseSettingsReset.${suffix}`)
      : t(`${base}.alerts.${prefixes[key]}${suffix[0].toUpperCase()}${suffix.slice(1)}`);
  const actionLabel = useCallback((key: CourseResetKey) => key === "settings"
    ? t("courseSettingsReset.action")
    : key === "boxes" ? t("app.actions.clear")
      : key === "reviews" ? t("app.actions.delete") : t("app.actions.restore"), [t]);

  const confirm = async () => {
    if (!dialog || busy.current) return;
    if (dialog.phase !== "confirm") { close(); return; }
    if (options.disabled) return;
    busy.current = true;
    const currentGeneration = generation.current;
    const key = dialog.key;
    setDialog({ key, phase: "working" });
    try {
      let count: number | undefined;
      if (key === "settings") await options.onResetSettings();
      else if (key === "boxes") await options.onResetBoxes();
      else if (key === "reviews") count = await options.onResetReviews();
      else await options.onResetAll();
      if (generation.current === currentGeneration) setDialog({ key, phase: "done", count });
    } catch {
      if (generation.current === currentGeneration) setDialog({ key, phase: "error" });
    } finally {
      busy.current = false;
    }
  };
  const working = dialog?.phase === "working";
  const confirming = dialog?.phase === "confirm";
  const done = dialog?.phase === "done";
  const key = dialog?.key ?? "settings";
  const color = key === "settings" ? "my_yellow" as const : "my_red" as const;
  const description = done && key === "reviews"
    ? t(`${base}.alerts.${dialog.count ? "resetReviewsDoneMessage" : "resetReviewsDoneEmpty"}`, { count: dialog.count ?? 0 })
    : text(key, done ? "doneMessage" : dialog?.phase === "error" ? "failed" : "confirmMessage");

  const resetActions = useMemo(() => keys.map((key) => ({
      key,
      title: key === "settings" ? t("courseSettingsReset.title") : t(`${base}.resetActions.${key}.title`),
      subtitle: key === "settings" ? t("courseSettingsReset.subtitle") : t(`${base}.resetActions.${key}.subtitle`),
      ctaText: actionLabel(key),
      loadingText: key === "settings" ? t("courseSettingsReset.loading") : t(`${base}.resetActions.${key}.loading`),
      buttonColor: key === "settings" ? "my_yellow" as const : "my_red" as const,
      buttonWidth: 130,
      loading: working && dialog.key === key,
      disabled: Boolean(options.disabled || working),
      onPress: () => {
        if (!options.disabled && !busy.current) setDialog({ key, phase: "confirm" });
      },
    })), [t, actionLabel, working, dialog?.key, options.disabled]);

  return {
    busy: working,
    resetActions,
    modal: dialog ? (
      <NudgeModal
        visible
        title={dialog.phase === "error" ? t("app.status.error") : text(key, done ? "doneTitle" : "confirmTitle")}
        description={description}
        confirmLabel={working ? t("components.courseEditor.courseSettingsPanel.loadingText.operationInProgress") : confirming ? actionLabel(key) : t("courseSettingsReset.ok")}
        confirmColor={confirming || working ? color : "my_green"}
        confirmDisabled={working || (confirming && options.disabled)}
        onConfirm={() => { void confirm(); }}
        onClose={close}
        closeLabel={t("courseSettingsReset.close")}
        secondaryLabel={confirming ? t("app.actions.cancel") : undefined}
        onSecondaryPress={confirming ? close : undefined}
      />
    ) : null,
  };
}
