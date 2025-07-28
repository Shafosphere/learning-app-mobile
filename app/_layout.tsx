import { Stack } from "expo-router";
import Navbar from "@/src/components/navbar/navbar";
import React, { useEffect } from "react";
import { SettingsProvider } from "@/src/contexts/SettingsContext";
import { initDB } from "@/src/components/db/db";

export default function RootLayout() {
  useEffect(() => {
    initDB().catch((e) => console.error("DB init failed", e));
  }, []);

  return (
    <SettingsProvider>
      <Navbar />
      <Stack screenOptions={{ headerShown: false }} />
    </SettingsProvider>
  );
}
