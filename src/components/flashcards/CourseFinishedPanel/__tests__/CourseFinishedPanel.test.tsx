import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { CourseFinishedPanel } from "../CourseFinishedPanel";

jest.mock("../CourseFinishedPanel-styles", () => ({
  useStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "components.flashcards.courseFinishedPanel.courseFinishedPanel.heading":
          "Gratulacje!",
        "components.flashcards.courseFinishedPanel.courseFinishedPanel.subheading":
          "Ukończyłeś kurs",
        "components.flashcards.courseFinishedPanel.courseFinishedPanel.statsHeading":
          "Twój wynik",
        "components.flashcards.courseFinishedPanel.courseFinishedPanel.label.fiszek":
          "fiszek",
        "components.flashcards.courseFinishedPanel.courseFinishedPanel.label.skutecznosc":
          "skuteczność",
        "components.flashcards.courseFinishedPanel.courseFinishedPanel.label.czasNauki":
          "czas nauki",
        "components.flashcards.courseFinishedPanel.courseFinishedPanel.text.wrocDoKursow":
          "Wróć do kursów",
      };
      return translations[key] ?? key;
    },
  }),
}));

jest.mock("@/src/components/button/button", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text } = jest.requireActual<typeof import("react-native")>(
    "react-native"
  );

  return function MyButtonMock({
    text,
    onPress,
    accessibilityLabel,
  }: {
    text?: string;
    onPress?: () => void;
    accessibilityLabel?: string;
  }) {
    return ReactActual.createElement(
      Pressable,
      {
        accessibilityRole: "button",
        accessibilityLabel: accessibilityLabel ?? text,
        onPress,
      },
      ReactActual.createElement(Text, null, text)
    );
  };
});

jest.mock("@/src/components/Box/Skin/BoxSkin", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react");
  const { View } = jest.requireActual<typeof import("react-native")>(
    "react-native"
  );

  return function BoxSkinMock() {
    return ReactActual.createElement(View);
  };
});

jest.mock("@/src/components/confetti/Confetti", () => {
  return function ConfettiMock() {
    return null;
  };
});

jest.mock("expo-image", () => ({
  Image: (props: object) => {
    const ReactActual = jest.requireActual<typeof import("react")>("react");
    const { View } = jest.requireActual<typeof import("react-native")>(
      "react-native"
    );

    return ReactActual.createElement(View, props);
  },
}));

jest.mock("@expo/vector-icons/Ionicons", () => "Ionicons");
jest.mock("@expo/vector-icons/AntDesign", () => "AntDesign");
jest.mock(
  "@expo/vector-icons/MaterialCommunityIcons",
  () => "MaterialCommunityIcons"
);
jest.mock("@expo/vector-icons/Octicons", () => "Octicons");

jest.mock("react-native-reanimated", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react");
  const { Text, View } = jest.requireActual<typeof import("react-native")>(
    "react-native"
  );

  const chain = {
    delay: () => chain,
    duration: () => chain,
    springify: () => chain,
    damping: () => chain,
    stiffness: () => chain,
    mass: () => chain,
    easing: () => chain,
  };

  return {
    __esModule: true,
    default: {
      View: ({ children, ...props }: React.PropsWithChildren<object>) => (
        ReactActual.createElement(View, props, children)
      ),
      Text: ({ children, ...props }: React.PropsWithChildren<object>) => (
        ReactActual.createElement(Text, props, children)
      ),
    },
    Easing: {
      cubic: jest.fn(),
      out: jest.fn(() => undefined),
    },
    FadeIn: { delay: () => chain },
    FadeInDown: { delay: () => chain },
    ZoomIn: { delay: () => chain },
    useReducedMotion: jest.fn(() => false),
  };
});

describe("CourseFinishedPanel", () => {
  it("renders the back to courses action from the finished panel", () => {
    const onBackToCourses = jest.fn();

    const { getByRole } = render(
      <CourseFinishedPanel
        courseName="Angielski A2"
        cardsCountLabel="15"
        accuracyLabel="87%"
        learningTimeLabel="12 min"
        onBackToCourses={onBackToCourses}
      />
    );

    fireEvent.press(
      getByRole("button", {
        name: "Wróć do kursów",
      })
    );

    expect(onBackToCourses).toHaveBeenCalledTimes(1);
  });

  it("keeps vertical regions proportional to the measured viewport", () => {
    const { getByTestId } = render(
      <CourseFinishedPanel
        courseName="Angielski A2"
        cardsCountLabel="15"
        accuracyLabel="87%"
        learningTimeLabel="12 min"
        onBackToCourses={jest.fn()}
      />
    );

    fireEvent(getByTestId("course-finished-panel"), "layout", {
      nativeEvent: {
        layout: { width: 800, height: 1200, x: 0, y: 0 },
      },
    });

    const titleStyle = StyleSheet.flatten(
      getByTestId("course-finished-title-region").props.style,
    );
    const headingStyle = StyleSheet.flatten(
      getByTestId("course-finished-heading").props.style,
    );
    const illustrationStyle = StyleSheet.flatten(
      getByTestId("course-finished-illustration-region").props.style,
    );
    const statsStyle = StyleSheet.flatten(
      getByTestId("course-finished-stats-region").props.style,
    );
    const actionStyle = StyleSheet.flatten(
      getByTestId("course-finished-action-region").props.style,
    );

    expect(titleStyle.height ?? titleStyle.minHeight).toBeCloseTo(
      1200 * 0.9 * 0.083,
    );
    expect(headingStyle.fontSize).toBeCloseTo(34 * ((1200 * 0.9) / 632));
    expect(
      illustrationStyle.height ?? illustrationStyle.minHeight,
    ).toBeCloseTo(1200 * 0.9 * 0.345);
    expect(statsStyle.height ?? statsStyle.minHeight).toBeCloseTo(
      1200 * 0.9 * 0.213,
    );
    expect(actionStyle.height ?? actionStyle.minHeight).toBeCloseTo(
      1200 * 0.9 * 0.079,
    );
  });
});
