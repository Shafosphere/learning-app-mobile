import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

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
  const React = require("react");
  const { Pressable, Text } = require("react-native");

  return function MyButtonMock({
    text,
    onPress,
    accessibilityLabel,
  }: {
    text?: string;
    onPress?: () => void;
    accessibilityLabel?: string;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? text}
        onPress={onPress}
      >
        <Text>{text}</Text>
      </Pressable>
    );
  };
});

jest.mock("@/src/components/Box/Skin/BoxSkin", () => {
  const React = require("react");
  const { View } = require("react-native");

  return function BoxSkinMock() {
    return <View />;
  };
});

jest.mock("@/src/components/confetti/Confetti", () => {
  return function ConfettiMock() {
    return null;
  };
});

jest.mock("expo-image", () => ({
  Image: (props: object) => {
    const React = require("react");
    const { View } = require("react-native");
    return <View {...props} />;
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
  const React = require("react");
  const { Text, View } = require("react-native");

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
        <View {...props}>{children}</View>
      ),
      Text: ({ children, ...props }: React.PropsWithChildren<object>) => (
        <Text {...props}>{children}</Text>
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
});
