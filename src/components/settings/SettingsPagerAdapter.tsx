import { useImperativeHandle, useRef } from "react";
import PagerView from "react-native-pager-view";
import type { SettingsPagerAdapterProps } from "./SettingsPagerAdapter.types";

export default function SettingsPagerAdapter({ children, initialPage, scrollEnabled, onSelect, onStateChange, ref }: SettingsPagerAdapterProps) {
  const pager = useRef<PagerView>(null);
  useImperativeHandle(ref, () => ({
    setPage: (index, animated) => {
      if (animated) pager.current?.setPage(index);
      else pager.current?.setPageWithoutAnimation(index);
    },
    setScrollEnabled: (enabled) => pager.current?.setScrollEnabled(enabled),
  }), []);
  return <PagerView ref={pager} style={{ flex: 1 }} testID="settings-native-pager"
    initialPage={initialPage} scrollEnabled={scrollEnabled}
    keyboardDismissMode="on-drag"
    onPageSelected={({ nativeEvent }) => onSelect(nativeEvent.position)}
    onPageScrollStateChanged={({ nativeEvent }) => onStateChange(nativeEvent.pageScrollState)}
  >{children}</PagerView>;
}
