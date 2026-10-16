import type { ReactNode, Ref } from "react";

export type SettingsPagerAdapterHandle = {
  setPage: (index: number, animated: boolean) => void;
  setScrollEnabled: (enabled: boolean) => void;
};
export type SettingsPagerAdapterProps = {
  children: ReactNode;
  initialPage: number;
  scrollEnabled: boolean;
  onSelect: (index: number) => void;
  onStateChange: (state: "idle" | "dragging" | "settling") => void;
  ref?: Ref<SettingsPagerAdapterHandle>;
};
