import { useSettings } from "@/src/contexts/SettingsContext";
import { useEffect } from "react";

export default function GoogleDriveBackupInitializer() {
  const {
    googleDriveBackupEnabled,
    googleDriveConnected,
    maybeRunGoogleDriveStartupBackup,
  } = useSettings();

  useEffect(() => {
    if (!googleDriveBackupEnabled || !googleDriveConnected) {
      return;
    }

    void maybeRunGoogleDriveStartupBackup();
  }, [
    googleDriveBackupEnabled,
    googleDriveConnected,
    maybeRunGoogleDriveStartupBackup,
  ]);

  return null;
}
