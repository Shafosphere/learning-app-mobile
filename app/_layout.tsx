import { Stack } from "expo-router";
import Navbar from "@/src/components/navbar/navbar";
import React from "react";
import { SettingsProvider } from "@/src/contexts/SettingsContext";

export default function RootLayout() {
  return (
    <SettingsProvider>
      <Navbar />
      <Stack screenOptions={{ headerShown: false }} />
    </SettingsProvider>
  );
}
