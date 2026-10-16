import React, { createRef, useCallback, useEffect, useState } from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { Platform, ScrollView, Text, TextInput } from "react-native";
import { SettingsTabPager, type SettingsTabPagerHandle } from "../SettingsTabPager";

jest.mock("../SettingsPagerAdapter", () => jest.requireActual("../SettingsPagerAdapter.web"));
const options = ["learning", "answers", "appearance"].map((key) => ({ key }));
afterEach(() => jest.restoreAllMocks());

it("navigates without native pager, retaining editable state and hiding inactive pages", () => {
  jest.replaceProperty(Platform, "OS", "web");
  const mounted = jest.fn();
  function Form({ tab }: { tab: string }) {
    const [draft, setDraft] = useState("");
    useEffect(() => { mounted(tab); }, [tab]);
    return <><Text accessibilityRole="header">{tab}</Text>
      <TextInput testID={`draft-${tab}`} value={draft} onChangeText={setDraft} /></>;
  }
  const ref = createRef<SettingsTabPagerHandle<string>>();
  function Harness() {
    const [value, setValue] = useState("learning");
    const renderPage = useCallback((tab: string) => <Form tab={tab} />, []);
    return <SettingsTabPager {...{ options, value, renderPage, ref }} scopeKey="web" onChange={setValue} />;
  }
  const screen = render(<Harness />);
  expect(screen.queryByTestId("settings-native-pager")).toBeNull();
  fireEvent.changeText(screen.getByTestId("draft-learning"), "unsaved");
  const scrollTo = jest.spyOn(ScrollView.prototype, "scrollTo");
  act(() => ref.current?.navigate("appearance"));
  expect(screen.getByRole("header", { name: "appearance" })).toBeTruthy();
  expect(screen.queryByRole("header", { name: "learning" })).toBeNull();
  expect(screen.getByTestId("settings-page-learning", { includeHiddenElements: true })).toHaveStyle({ display: "none" });
  act(() => ref.current?.navigate("learning"));
  expect(screen.getByTestId("draft-learning").props.value).toBe("unsaved");
  expect(mounted.mock.calls.filter(([tab]) => tab === "learning")).toHaveLength(1);
  expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
});
