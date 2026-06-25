import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import Navbar from "@/src/components/navbar/navbar";

const mockDismissTo = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  usePathname: jest.fn(() => "/review/reviewflashcards"),
  useRouter: jest.fn(() => ({
    dismissTo: mockDismissTo,
    push: mockPush,
  })),
}));

jest.mock("expo-navigation-bar", () => ({
  setButtonStyleAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-image", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    Image: (props: Record<string, unknown>) => <View {...props} />,
  };
});

jest.mock("@expo/vector-icons/FontAwesome5", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return (props: { name: string }) => <Text>{props.name}</Text>;
});

jest.mock("@expo/vector-icons/Foundation", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return (props: { name: string }) => <Text>{props.name}</Text>;
});

jest.mock("@expo/vector-icons/Ionicons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return (props: { name: string }) => <Text>{props.name}</Text>;
});

jest.mock("@expo/vector-icons/MaterialIcons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return (props: { name: string }) => <Text>{props.name}</Text>;
});

jest.mock("@edwardloopez/react-native-coachmark", () => ({
  CoachmarkAnchor: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/src/components/navbar/navbar-styles", () => ({
  useStyles: jest.fn(() => new Proxy({}, { get: () => ({}) })),
}));

jest.mock("@/src/components/navbar/NavbarStatsRotator", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return function NavbarStatsRotatorMock({ onPress }: { onPress: () => void }) {
    return (
      <Pressable onPress={onPress}>
        <Text>stats</Text>
      </Pressable>
    );
  };
});

jest.mock("@/src/components/course/CourseTitleMarquee", () => ({
  CourseTitleMarquee: ({ text }: { text: string }) => {
    const React = require("react");
    const { Text } = require("react-native");
    return <Text>{text}</Text>;
  },
}));

jest.mock("@/src/constants/customCourse", () => ({
  resolveCourseIconProps: jest.fn(() => ({})),
}));

jest.mock("@/src/constants/languageFlags", () => ({
  getFlagSource: jest.fn(() => undefined),
}));

jest.mock("@/src/constants/officialPacks", () => ({
  OFFICIAL_PACKS: [],
}));

jest.mock("@/src/contexts/DueReviewsContext", () => ({
  useDueReviews: jest.fn(() => ({
    dueReviewCount: 3,
    refreshDueReviewCount: jest.fn(() => Promise.resolve()),
  })),
}));

jest.mock("@/src/contexts/PopupContext", () => ({
  usePopupAnchorSetter: jest.fn(() => jest.fn()),
}));

jest.mock("@/src/contexts/QuoteContext", () => ({
  useQuote: jest.fn(() => ({
    triggerQuote: jest.fn(),
  })),
}));

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: jest.fn(() => ({
    theme: "light",
    toggleTheme: jest.fn(),
    activeCustomCourseId: null,
    customCourseEntrySettingsSeenHydrated: true,
    hasSeenCustomCourseEntrySettings: jest.fn(() => true),
    selectedLevel: null,
    activeCourse: null,
    colors: {
      background: "#fff",
      secondBackground: "#f8fafc",
      headline: "#111827",
      lightbg: "#fff",
      darkbg: "#111827",
      my_red: "#ef4444",
      my_green: "#22c55e",
      border: "#e5e7eb",
    },
    pinnedOfficialCourseIds: [],
    setActiveCustomCourseId: jest.fn(() => Promise.resolve()),
  })),
}));

jest.mock("@/src/db/sqlite/db", () => ({
  getCustomCourseById: jest.fn(() => Promise.resolve(null)),
}));

describe("Navbar review routing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("dismisses to the review course selection screen from stale review child routes", () => {
    const screen = render(<Navbar />);

    fireEvent.press(
      screen.getByLabelText(
        "components.navbar.navbar.accessibilityLabel.przejdzDoPowtorekValue"
      )
    );

    expect(mockDismissTo).toHaveBeenCalledWith("/review");
    expect(mockPush).not.toHaveBeenCalledWith("/review");
  });
});
