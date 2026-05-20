import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { exportAndShareUserData } from "@/src/services/exportUserData";
import { markLocalExportCompleted } from "@/src/services/localExportReminder";

type UseUserDataExportActionOptions = {
  onSuccess?: () => void | Promise<void>;
};

export function useUserDataExportAction({
  onSuccess,
}: UseUserDataExportActionOptions = {}) {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);
  const [successSummary, setSuccessSummary] = useState<{
    fileName: string;
    sizeKb: string;
  } | null>(null);
  const exportingRef = useRef(false);

  const dismissSuccess = useCallback(() => {
    setSuccessSummary(null);
  }, []);

  const runExport = useCallback(async () => {
    if (exportingRef.current) {
      return;
    }

    exportingRef.current = true;
    setExporting(true);

    try {
      const result = await exportAndShareUserData();
      await markLocalExportCompleted();

      const sizeKb = (result.bytesWritten / 1024).toFixed(1);
      setSuccessSummary({
        fileName: result.fileName,
        sizeKb,
      });

      await onSuccess?.();
    } catch (error) {
      console.error("[useUserDataExportAction] export error", error);
      Alert.alert(
        t("app.status.error"),
        t("settings.coursesData.errors.exportUserData")
      );
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  }, [onSuccess, t]);

  return { exporting, runExport, successSummary, dismissSuccess };
}
