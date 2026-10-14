import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

export type NativePackState = {
  name: string;
  status: number;
  errorCode: number;
  downloadedBytes: number;
  totalBytes: number;
  transferProgress: number;
};
export type PlayAssetDeliveryModule = {
  addListener(event: "onPackState", listener: (state: NativePackState) => void): { remove(): void };
  getPackStates(names: string[]): Promise<NativePackState[]>;
  fetch(names: string[]): Promise<NativePackState[]>;
  cancel(names: string[]): Promise<NativePackState[]>;
  getPackLocation(name: string): Promise<string | null>;
  checkPackReady(name: string, expectedManifestHash: string): Promise<boolean>;
  resolveAssetUri(name: string, relativePath: string): Promise<string | null>;
  showConfirmationDialog(): Promise<boolean>;
};

export const playAssetDelivery = Platform.OS === "android"
  ? requireOptionalNativeModule<PlayAssetDeliveryModule>("PlayAssetDelivery")
  : null;
