import { useTranslation } from "react-i18next";
import { NudgeModal } from "@/src/components/nudge/NudgeModal";

type UserDataExportSuccessModalProps = {
  visible: boolean;
  sizeKb?: string | null;
  onClose: () => void;
};

export function UserDataExportSuccessModal({
  visible,
  sizeKb,
  onClose,
}: UserDataExportSuccessModalProps) {
  const { t } = useTranslation();

  return (
    <NudgeModal
      visible={visible}
      title={t("settings.coursesData.exportFile.successTitle")}
      description={t("settings.coursesData.exportFile.successMessage", {
        sizeKb: sizeKb ?? "0.0",
      })}
      confirmLabel={t("settings.coursesData.exportFile.successConfirm")}
      onConfirm={onClose}
      onClose={onClose}
    />
  );
}
