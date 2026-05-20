import { render } from "@testing-library/react-native";
import { UserDataExportSuccessModal } from "@/src/components/export/UserDataExportSuccessModal";

jest.mock("@/src/components/nudge/NudgeModal", () => ({
  NudgeModal: ({
    title,
    description,
    visible,
  }: {
    title: string;
    description?: string;
    visible: boolean;
  }) => {
    const React = jest.requireActual("react");
    const { Text, View } = jest.requireActual("react-native");

    return visible
      ? React.createElement(
          View,
          null,
          React.createElement(Text, null, title),
          React.createElement(Text, null, description)
        )
      : null;
  },
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (key === "settings.coursesData.exportFile.successTitle") {
        return "Kopia zapisana";
      }
      if (key === "settings.coursesData.exportFile.successMessage") {
        return `Lokalna kopia danych została zapisana. Rozmiar pliku: ${params?.sizeKb} kB.`;
      }
      if (key === "settings.coursesData.exportFile.successConfirm") {
        return "OK";
      }
      return key;
    },
  }),
}));

describe("UserDataExportSuccessModal", () => {
  it("shows a short success message without technical file details", () => {
    const screen = render(
      <UserDataExportSuccessModal
        visible
        sizeKb="22.7"
        onClose={() => {}}
      />
    );

    expect(screen.getByText("Kopia zapisana")).toBeTruthy();
    expect(
      screen.getByText(
        "Lokalna kopia danych została zapisana. Rozmiar pliku: 22.7 kB."
      )
    ).toBeTruthy();
    expect(screen.queryByText(/content:\/\//)).toBeNull();
    expect(screen.queryByText(/udostępniania/i)).toBeNull();
  });
});
