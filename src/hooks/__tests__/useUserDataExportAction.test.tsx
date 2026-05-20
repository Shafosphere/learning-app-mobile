import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook } from "@testing-library/react-native";
import { Alert } from "react-native";
import { useUserDataExportAction } from "@/src/hooks/useUserDataExportAction";
import { getLocalExportReminderState } from "@/src/services/localExportReminder";
import { exportAndShareUserData } from "@/src/services/exportUserData";

jest.mock("@/src/services/exportUserData", () => ({
  exportAndShareUserData: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

const mockedExportAndShareUserData = jest.mocked(exportAndShareUserData);
const exportPayload = {} as Awaited<ReturnType<typeof exportAndShareUserData>>["payload"];

describe("useUserDataExportAction", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockedExportAndShareUserData.mockReset();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("marks the local export reminder as completed after a successful export", async () => {
    mockedExportAndShareUserData.mockResolvedValue({
      fileUri: "file:///export.json",
      fileName: "export.json",
      bytesWritten: 2048,
      payload: exportPayload,
      delivery: "saved_to_selected_folder",
      sharingSupported: true,
      shared: true,
    });

    const onSuccess = jest.fn();
    const { result } = renderHook(() => useUserDataExportAction({ onSuccess }));

    await act(async () => {
      await result.current.runExport();
    });

    const state = await getLocalExportReminderState();
    expect(state.lastSuccessfulExportAt).not.toBeNull();
    expect(result.current.successSummary).toEqual({
      fileName: "export.json",
      sizeKb: "2.0",
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("clears the success summary when dismissed", async () => {
    mockedExportAndShareUserData.mockResolvedValue({
      fileUri: "file:///export.json",
      fileName: "export.json",
      bytesWritten: 2048,
      payload: exportPayload,
      delivery: "saved_to_selected_folder",
      sharingSupported: true,
      shared: true,
    });

    const { result } = renderHook(() => useUserDataExportAction());

    await act(async () => {
      await result.current.runExport();
    });

    expect(result.current.successSummary).not.toBeNull();

    act(() => {
      result.current.dismissSuccess();
    });

    expect(result.current.successSummary).toBeNull();
  });

  it("does not mark export completion when the export fails", async () => {
    mockedExportAndShareUserData.mockRejectedValue(new Error("nope"));
    const { result } = renderHook(() => useUserDataExportAction());

    await act(async () => {
      await result.current.runExport();
    });

    const state = await getLocalExportReminderState();
    expect(state.lastSuccessfulExportAt).toBeNull();
    expect(result.current.successSummary).toBeNull();
  });

  it("ignores a second run while an export is already in progress", async () => {
    let resolveExport: () => void = () => {};
    mockedExportAndShareUserData.mockReturnValue(
      new Promise((resolve) => {
        resolveExport = () =>
          resolve({
            fileUri: "file:///export.json",
            fileName: "export.json",
            bytesWritten: 1024,
            payload: exportPayload,
            delivery: "saved_to_selected_folder",
            sharingSupported: true,
            shared: true,
          });
      })
    );

    const { result } = renderHook(() => useUserDataExportAction());

    await act(async () => {
      const firstRun = result.current.runExport();
      const secondRun = result.current.runExport();
      resolveExport();
      await Promise.all([firstRun, secondRun]);
    });

    expect(mockedExportAndShareUserData).toHaveBeenCalledTimes(1);
  });
});
