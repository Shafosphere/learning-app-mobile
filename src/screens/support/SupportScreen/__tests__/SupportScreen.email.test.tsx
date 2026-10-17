import { act, fireEvent, render } from "@testing-library/react-native";
import { AppState, Linking, Modal, Platform, type AppStateStatus } from "react-native";
import * as MailComposer from "expo-mail-composer";
import { createSupportDiagnosticsAttachment } from "@/src/services/supportDiagnostics";
import SupportScreen from "../SupportScreen";

jest.mock("@expo/vector-icons/Ionicons", () => () => null);
jest.mock("expo-device", () => ({ modelName: "Test phone", osName: "Test OS", osVersion: "1" }));
jest.mock("expo-router", () => ({ Link: ({ children }: any) => children }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/src/hooks/useDeviceLayout", () => ({
  useDeviceLayout: () => ({ isTabletLayout: false, shortestSide: 400 }),
}));
jest.mock("@/src/contexts/SettingsContext", () => {
  const { defaultValue } = jest.requireActual("@/src/contexts/settings/defaults");
  return { useSettings: () => defaultValue, useThemeSettings: () => defaultValue };
});
jest.mock("@/src/services/supportDiagnostics", () => ({
  createSupportDiagnosticsAttachment: jest.fn(),
}));
jest.mock("expo-mail-composer", () => ({
  isAvailableAsync: jest.fn(),
  composeAsync: jest.fn(),
  MailComposerStatus: { SENT: "sent", CANCELLED: "cancelled", SAVED: "saved", UNDETERMINED: "undetermined" },
}));

const available = jest.mocked(MailComposer.isAvailableAsync);
const compose = jest.mocked(MailComposer.composeAsync);
let changeState: (state: AppStateStatus) => void;
let removeListener: jest.Mock;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function pressReport(screen: ReturnType<typeof render>) {
  await act(async () => {
    fireEvent.press(screen.getByRole("button", { name: "support.report.button" }));
  });
}

function returnFromMail() {
  act(() => {
    changeState("background");
    changeState("active");
  });
}

function expectThanks(screen: ReturnType<typeof render>, visible: boolean) {
  expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(visible);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(Platform, "OS", "android");
  AppState.currentState = "active";
  removeListener = jest.fn();
  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => {
    changeState = listener;
    return { remove: removeListener };
  });
  jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  jest.spyOn(console, "warn").mockImplementation(() => {});
  available.mockResolvedValue(true);
  compose.mockResolvedValue({ status: MailComposer.MailComposerStatus.SENT });
});

afterEach(() => jest.restoreAllMocks());

it.each(["before", "after"])("Android shows thanks once when returning %s composer resolution", async (order) => {
  const result = deferred<MailComposer.MailComposerResult>();
  compose.mockReturnValueOnce(result.promise);
  const screen = render(<SupportScreen />);
  await pressReport(screen);
  expectThanks(screen, false);
  if (order === "before") returnFromMail();
  expectThanks(screen, false);
  await act(async () => { result.resolve({ status: MailComposer.MailComposerStatus.SENT }); });
  expectThanks(screen, order === "before");
  if (order === "after") returnFromMail();
  expectThanks(screen, true);
  fireEvent.press(screen.getByRole("button", { name: "support.report.thankYou.confirm" }));
  returnFromMail();
  expectThanks(screen, false);
  await pressReport(screen);
  expectThanks(screen, false);
  returnFromMail();
  expectThanks(screen, true);
});

it.each(["before", "after", "no AppState change"])("iOS handles SENT with %s return", async (order) => {
  jest.replaceProperty(Platform, "OS", "ios");
  const result = deferred<MailComposer.MailComposerResult>();
  compose.mockReturnValueOnce(result.promise);
  const screen = render(<SupportScreen />);
  await pressReport(screen);
  if (order === "before") returnFromMail();
  if (order === "after") act(() => changeState("inactive"));
  await act(async () => { result.resolve({ status: MailComposer.MailComposerStatus.SENT }); });
  expectThanks(screen, order !== "after");
  if (order === "after") act(() => changeState("active"));
  expectThanks(screen, true);
  expect(Linking.openURL).not.toHaveBeenCalled();
});

it.each(["ios", "android"] as const)("%s suppresses thanks and fallback for cancelled/saved mail", async (platform) => {
  jest.replaceProperty(Platform, "OS", platform);
  const screen = render(<SupportScreen />);
  for (const status of [MailComposer.MailComposerStatus.CANCELLED, MailComposer.MailComposerStatus.SAVED]) {
    compose.mockResolvedValueOnce({ status });
    await pressReport(screen);
    returnFromMail();
    expectThanks(screen, false);
  }
  expect(Linking.openURL).not.toHaveBeenCalled();
});

it.each(["before", "after"])("mailto shows thanks on return %s openURL resolution", async (order) => {
  available.mockResolvedValue(false);
  const opened = deferred<void>();
  jest.mocked(Linking.openURL).mockReturnValueOnce(opened.promise);
  const screen = render(<SupportScreen />);
  await pressReport(screen);
  if (order === "before") returnFromMail();
  expectThanks(screen, false);
  await act(async () => { opened.resolve(); });
  if (order === "after") {
    expectThanks(screen, false);
    returnFromMail();
  }
  expectThanks(screen, true);
});

it("clears a failed mailto attempt even if the app returned before rejection", async () => {
  available.mockResolvedValue(false);
  const opened = deferred<void>();
  jest.mocked(Linking.openURL).mockReturnValueOnce(opened.promise);
  const screen = render(<SupportScreen />);
  await pressReport(screen);
  returnFromMail();
  await act(async () => { opened.reject(new Error("No mail client")); });
  returnFromMail();
  expectThanks(screen, false);
  expect(screen.getByText("support.status.mailClientFailed")).toBeTruthy();
});

it("falls back after composer failure and waits for the mailto return", async () => {
  compose.mockRejectedValueOnce(new Error("Composer unavailable"));
  const screen = render(<SupportScreen />);
  await pressReport(screen);
  expect(Linking.openURL).toHaveBeenCalledTimes(1);
  expectThanks(screen, false);
  returnFromMail();
  expectThanks(screen, true);
});

it.each([true, false])("suggestions never trigger thanks (composer available: %s)", async (isAvailable) => {
  const screen = render(<SupportScreen />);
  await pressReport(screen); // Leave a report attempt pending before starting a suggestion.
  available.mockResolvedValue(isAvailable);
  await act(async () => {
    fireEvent.press(screen.getByRole("button", { name: "support.suggestion.button" }));
  });
  returnFromMail();
  expectThanks(screen, false);
});

it("preserves optional diagnostic body and attachment", async () => {
  jest.mocked(createSupportDiagnosticsAttachment).mockResolvedValue("file:///diagnostics.json");
  const screen = render(<SupportScreen />);
  for (const checkbox of screen.getAllByRole("checkbox")) fireEvent.press(checkbox);
  await pressReport(screen);
  expect(compose).toHaveBeenCalledWith(expect.objectContaining({
    attachments: ["file:///diagnostics.json"],
    body: expect.stringContaining("Test phone"),
  }));
  returnFromMail();
  expectThanks(screen, true);
});

it.each(["close", "back"])("dismisses thanks using %s", async (action) => {
  const screen = render(<SupportScreen />);
  await pressReport(screen);
  returnFromMail();
  if (action === "close") {
    fireEvent.press(screen.getByRole("button", { name: "support.report.thankYou.close" }));
  } else {
    fireEvent(screen.UNSAFE_getByType(Modal), "requestClose");
  }
  expectThanks(screen, false);
});

it("removes listener and discards pending completion after unmount", async () => {
  const result = deferred<MailComposer.MailComposerResult>();
  compose.mockReturnValueOnce(result.promise);
  const screen = render(<SupportScreen />);
  await pressReport(screen);
  screen.unmount();
  expect(removeListener).toHaveBeenCalledTimes(1);
  await act(async () => { result.resolve({ status: MailComposer.MailComposerStatus.SENT }); });
  expect(Linking.openURL).not.toHaveBeenCalled();
});
