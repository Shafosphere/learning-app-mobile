import { useSettings } from "@/src/contexts/SettingsContext";
import { useEffect } from "react";

export default function GoogleDriveBackupInitializer() {
  const { googleDriveConnected, refreshGoogleDriveBackupSnapshots } = useSettings();

  useEffect(() => {
    if (!googleDriveConnected) {
      return;
    }

    void refreshGoogleDriveBackupSnapshots();
  }, [googleDriveConnected, refreshGoogleDriveBackupSnapshots]);

  return null;
}
