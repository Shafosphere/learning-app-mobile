import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SettingsTabPagerHandle } from "@/src/components/settings/SettingsTabPager";
import { useTranslation } from "react-i18next";
import type { SettingsTabOption } from "@/src/components/settings/SettingsTabBar";

export type CourseSettingsTabKey =
  | "learning"
  | "answers"
  | "audio"
  | "appearance"
  | "progress";

const CATEGORIES: readonly Omit<
  SettingsTabOption<CourseSettingsTabKey>,
  "label"
>[] = [
  { key: "learning", icon: "school" },
  { key: "answers", icon: "chatbubble-ellipses" },
  { key: "audio", icon: "volume-high" },
  { key: "appearance", icon: "color-palette" },
  { key: "progress", icon: "refresh-circle" },
];

export function useCourseSettingsTabs({
  scopeKey,
  hasAudio,
  hasResetActions,
}: {
  scopeKey: string | number;
  hasAudio: boolean;
  hasResetActions: boolean;
}) {
  const { t } = useTranslation();
  const pagerRef = useRef<SettingsTabPagerHandle<CourseSettingsTabKey>>(null);
  const [selection, setSelection] = useState<{
    scopeKey: string | number;
    tab: CourseSettingsTabKey;
  }>({ scopeKey, tab: "learning" });
  const options = useMemo(() => CATEGORIES.filter(
    ({ key }) =>
      (key !== "audio" || hasAudio) && (key !== "progress" || hasResetActions),
  ).map((option) => ({
    ...option,
    label: t(`courseSettingsGroups.${option.key}.title`),
  })), [hasAudio, hasResetActions, t]);
  const activeTab =
    selection.scopeKey === scopeKey &&
    options.some(({ key }) => key === selection.tab)
      ? selection.tab
      : "learning";

  // Commit fallback so a removed category does not reappear selected later.
  useEffect(() => {
    if (selection.scopeKey !== scopeKey || selection.tab !== activeTab) {
      setSelection({ scopeKey, tab: activeTab });
    }
  }, [activeTab, scopeKey, selection]);

  const onCommit = useCallback((tab: CourseSettingsTabKey) => {
    if (tab !== activeTab && options.some(({ key }) => key === tab))
      setSelection({ scopeKey, tab });
  }, [activeTab, options, scopeKey]);

  const onChange = useCallback((tab: CourseSettingsTabKey) => {
    if (tab !== activeTab && options.some(({ key }) => key === tab)) {
      pagerRef.current?.navigate(tab);
    }
  }, [activeTab, options]);

  return { activeTab, options, onChange, onCommit, pagerRef, scopeKey };
}
