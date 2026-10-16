import { useImperativeHandle } from "react";
import { View } from "react-native";
import type { SettingsPagerAdapterProps } from "./SettingsPagerAdapter.types";

// Web uses the accessible tab bar. Retained pages stay mounted in the shared owner.
export default function SettingsPagerAdapter({ children, onSelect, ref }: SettingsPagerAdapterProps) {
  useImperativeHandle(ref, () => ({
    setPage: (index) => onSelect(index),
    setScrollEnabled: () => {},
  }), [onSelect]);
  return <View style={{ flex: 1 }} testID="settings-web-pager">{children}</View>;
}
