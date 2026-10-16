import React, {
  useCallback, useContext, useEffect, useImperativeHandle, useLayoutEffect,
  useRef, useState, type ReactNode, type Ref,
} from "react";
import { Keyboard, Platform, ScrollView, StyleSheet, View, type ScrollViewProps } from "react-native";
import { NavigationContext } from "@react-navigation/native";
import { SettingsPagerGestureContext } from "./SettingsPagerGestureContext";
import SettingsPagerAdapter from "./SettingsPagerAdapter";
import type { SettingsPagerAdapterHandle } from "./SettingsPagerAdapter.types";
import { useSettingsPagerAccessibility } from "./useSettingsPagerAccessibility";

export type SettingsTabPagerHandle<T extends string> = {
  navigate: (key: T) => void;
  scrollToTop: () => void;
};
type Props<T extends string> = {
  options: readonly { key: T }[];
  value: T;
  onChange: (key: T) => void;
  renderPage: (key: T) => ReactNode;
  scopeKey: string | number;
  enabled?: boolean;
  scrollViewProps?: Omit<ScrollViewProps, "children">;
  ref?: Ref<SettingsTabPagerHandle<T>>;
};

export function SettingsTabPager<T extends string>(props: Props<T>) {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);
  useEffect(() => {
    if (!navigation) return;
    setFocused(navigation.isFocused());
    const focus = navigation.addListener("focus", () => setFocused(true));
    const blur = navigation.addListener("blur", () => setFocused(false));
    return () => { focus(); blur(); };
  }, [navigation]);
  return focused ? <PagerContent key={JSON.stringify(props.scopeKey)} {...props} /> : <View style={styles.viewport} />;
}

function PageBody<T extends string>({ tab, renderPage }: { tab: T; renderPage: (key: T) => ReactNode }) {
  return <>{renderPage(tab)}</>;
}
const MemoPageBody = React.memo(PageBody) as typeof PageBody;

function PagerContent<T extends string>({ options, value, onChange, renderPage, enabled = true, scrollViewProps, ref }: Props<T>) {
  const adapter = useRef<SettingsPagerAdapterHandle>(null);
  const scrollViews = useRef(new Map<T, ScrollView>());
  const locks = useRef(new Set<object>());
  const busy = useRef(false);
  const waitForIdle = useRef(false);
  const alive = useRef(true);
  const { screenReader, reduceMotion } = useSettingsPagerAccessibility();
  const index = Math.max(0, options.findIndex(({ key }) => key === value));
  const signature = JSON.stringify(options.map(({ key }) => key));
  const currentSignature = useRef(signature);
  currentSignature.current = signature;
  const selected = useRef(value);
  const pendingReset = useRef<T | null>(null);
  const [retained, setRetained] = useState<Set<T>>(() => new Set(
    options.slice(enabled ? Math.max(0, index - 1) : index, enabled ? index + 2 : index + 1).map(({ key }) => key),
  ));
  const swipeEnabled = enabled && !screenReader;
  const swipeAllowed = useRef(swipeEnabled);
  swipeAllowed.current = swipeEnabled;

  useLayoutEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  const syncedSignature = useRef(signature);
  useLayoutEffect(() => {
    if (selected.current !== value || syncedSignature.current !== signature) {
      if (selected.current !== value) {
        pendingReset.current = value;
        const scroll = scrollViews.current.get(value);
        if (scroll) {
          scroll.scrollTo({ y: 0, animated: false });
          pendingReset.current = null;
        }
      }
      selected.current = value;
      syncedSignature.current = signature;
      busy.current = false;
      adapter.current?.setPage(index, false);
    }
  }, [value, index, signature]);
  useEffect(() => {
    setRetained((previous) => {
      const next = new Set([...previous].filter((key) => options.some((option) => option.key === key)));
      options.slice(enabled ? Math.max(0, index - 1) : index, enabled ? index + 2 : index + 1)
        .forEach(({ key }) => next.add(key));
      return next.size === previous.size && [...next].every((key) => previous.has(key)) ? previous : next;
    });
  }, [options, index, enabled]);
  useLayoutEffect(() => {
    adapter.current?.setScrollEnabled(swipeEnabled && locks.current.size === 0);
  }, [swipeEnabled]);

  const setGestureLock = useCallback((token: object, locked: boolean) => {
    if (locked) locks.current.add(token);
    else locks.current.delete(token);
    adapter.current?.setScrollEnabled(swipeAllowed.current && locks.current.size === 0);
  }, []);
  const onSelect = (position: number) => {
    if (!alive.current || currentSignature.current !== signature || !Number.isInteger(position)) return;
    const key = options[position]?.key;
    if (key === undefined || key === selected.current) return;
    if (!waitForIdle.current) busy.current = false;
    selected.current = key;
    pendingReset.current = key;
    scrollViews.current.get(key)?.scrollTo({ y: 0, animated: false });
    if (scrollViews.current.has(key)) pendingReset.current = null;
    setRetained((previous) => previous.has(key) ? previous : new Set([...previous, key]));
    Keyboard.dismiss();
    onChange(key);
  };
  useImperativeHandle(ref, () => ({
    navigate: (key) => {
      const target = options.findIndex((option) => option.key === key);
      if (busy.current || target < 0 || key === selected.current) return;
      busy.current = true;
      waitForIdle.current = !reduceMotion && Platform.OS !== "web";
      setRetained((previous) => previous.has(key) ? previous : new Set([...previous, key]));
      adapter.current?.setPage(target, !reduceMotion);
    },
    scrollToTop: () => scrollViews.current.get(selected.current)?.scrollTo({ y: 0, animated: false }),
  }));

  return <SettingsPagerGestureContext.Provider value={setGestureLock}>
    <View style={styles.viewport} testID="settings-tab-pager">
      <SettingsPagerAdapter ref={adapter} initialPage={index} scrollEnabled={swipeEnabled}
        onSelect={onSelect} onStateChange={(state) => {
          if (alive.current && currentSignature.current === signature) {
            busy.current = state !== "idle";
            waitForIdle.current = state !== "idle";
          }
        }}>
        {options.map(({ key }) => {
          const active = key === value;
          return <View key={key} collapsable={false} testID={`settings-page-${key}`}
            style={[styles.page, Platform.OS === "web" && !active && styles.hidden]}
            pointerEvents={active ? "auto" : "none"}
            accessibilityElementsHidden={!active}
            importantForAccessibility={active ? "auto" : "no-hide-descendants"}>
            {retained.has(key) ? <ScrollView {...scrollViewProps} removeClippedSubviews={false}
              style={[styles.scroll, scrollViewProps?.style]}
              ref={(node) => {
                if (node) scrollViews.current.set(key, node);
                else scrollViews.current.delete(key);
              }}
              onLayout={(event) => {
                if (pendingReset.current === key) {
                  scrollViews.current.get(key)?.scrollTo({ y: 0, animated: false });
                  pendingReset.current = null;
                }
                scrollViewProps?.onLayout?.(event);
              }}>
              <MemoPageBody tab={key} renderPage={renderPage} />
            </ScrollView> : null}
          </View>;
        })}
      </SettingsPagerAdapter>
    </View>
  </SettingsPagerGestureContext.Provider>;
}
const styles = StyleSheet.create({
  viewport: { flex: 1, width: "100%", overflow: "hidden" },
  page: { width: "100%", height: "100%" },
  hidden: { display: "none" },
  scroll: { flex: 1, width: "100%", alignSelf: "center" },
});
