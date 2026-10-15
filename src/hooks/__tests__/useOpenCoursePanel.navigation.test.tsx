import React, { useState } from "react";
import { Button, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import { act, cleanup, fireEvent, renderRouter, screen } from "expo-router/testing-library";
import { useOpenCoursePanel } from "../useOpenCoursePanel";

function OpenPanelButton() {
  const openCoursePanel = useOpenCoursePanel();
  return <Button title="Open courses" onPress={openCoursePanel} />;
}

function Layout() {
  return (
    <View style={{ flex: 1 }}>
      <OpenPanelButton />
      <Stack screenOptions={{ headerShown: false, animation: "none", freezeOnBlur: true }} />
    </View>
  );
}

function Panel() {
  const [selection, setSelection] = useState(0);
  return (
    <View>
      <Text>Selection {selection}</Text>
      <Button title="Select course" onPress={() => setSelection(1)} />
    </View>
  );
}

function ReturnToPanel() {
  return <Button title="Return to courses" onPress={() => router.dismissTo("/coursepanel")} />;
}

function start(initialUrl = "/") {
  return renderRouter({
    _layout: Layout,
    index: () => <Text>Home</Text>,
    "coursepanel/index": Panel,
    "createcourse/index": ReturnToPanel,
    "custom_course/index": () => <Text>Appearance</Text>,
    "custom_course/content": () => <Text>Content</Text>,
    "custom_course/settings": ReturnToPanel,
    "editcourse/index": () => <Text>Editor</Text>,
    "flashcards/index": ReturnToPanel,
    "course-entry-settings/index": ReturnToPanel,
    "settings/index": () => <Text>Settings</Text>,
  }, { initialUrl });
}

function openPanel() {
  fireEvent.press(screen.getByText("Open courses"));
}

function stackRoutes(app: ReturnType<typeof start>) {
  // ExpoRoot wraps the application's Stack in its internal __root route.
  return app.getRouterState()!.routes[0].state!.routes;
}

afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

describe("course panel stack navigation", () => {
  it("keeps the caller on first entry and returns to it with Back", () => {
    const app = start();
    openPanel();
    expect(app.getPathname()).toBe("/coursepanel");
    expect(stackRoutes(app).map((route) => route.name)).toEqual(["index", "coursepanel/index"]);
    act(() => router.back());
    expect(app.getPathname()).toBe("/");
  });

  it("reuses the panel key and local state when opened repeatedly or from Settings", () => {
    const app = start();
    openPanel();
    const panelKey = stackRoutes(app).at(-1)?.key;
    fireEvent.press(screen.getByText("Select course"));
    for (let i = 0; i < 3; i++) {
      openPanel();
      act(() => router.push("/settings"));
      openPanel();
      expect(stackRoutes(app).map((route) => route.name)).toEqual(["index", "coursepanel/index"]);
      expect(stackRoutes(app).at(-1)?.key).toBe(panelKey);
      expect(screen.getByText("Selection 1")).toBeTruthy();
    }
    act(() => router.back());
    expect(app.getPathname()).toBe("/");
  });

  it.each(["/createcourse", "/flashcards", "/course-entry-settings"] as const)(
    "pops %s on return without accumulating panels",
    (path) => {
      const app = start();
      openPanel();
      const panelKey = stackRoutes(app).at(-1)?.key;
      for (let i = 0; i < 3; i++) {
        act(() => router.push(path));
        fireEvent.press(screen.getByText("Return to courses"));
        expect(stackRoutes(app).map((route) => route.name)).toEqual(["index", "coursepanel/index"]);
        expect(stackRoutes(app).at(-1)?.key).toBe(panelKey);
      }
    },
  );

  it("removes the creation flow after saving and preserves the previous panel", () => {
    const app = start();
    openPanel();
    const panelKey = stackRoutes(app).at(-1)?.key;
    for (const path of ["/createcourse", "/custom_course", "/custom_course/content", "/custom_course/settings"] as const) {
      act(() => router.push(path));
    }
    fireEvent.press(screen.getByText("Return to courses"));
    expect(stackRoutes(app).map((route) => route.name)).toEqual(["index", "coursepanel/index"]);
    expect(stackRoutes(app).at(-1)?.key).toBe(panelKey);
    act(() => router.back());
    expect(app.getPathname()).toBe("/");
  });

  it("preserves the panel when going back from editing", () => {
    const app = start();
    openPanel();
    const panelKey = stackRoutes(app).at(-1)?.key;
    act(() => router.push("/editcourse?id=11&name=Course"));
    act(() => router.back());
    expect(app.getPathname()).toBe("/coursepanel");
    expect(stackRoutes(app).at(-1)?.key).toBe(panelKey);
  });

  it.each(["/createcourse", "/flashcards", "/custom_course/settings", "/course-entry-settings"])(
    "replaces %s when returning without an earlier panel",
    (initialUrl) => {
      const app = start(initialUrl);
      fireEvent.press(screen.getByText("Return to courses"));
      expect(app.getPathname()).toBe("/coursepanel");
      expect(stackRoutes(app).map((route) => route.name)).toEqual(["coursepanel/index"]);
      expect(router.canGoBack()).toBe(false);
    },
  );
});
