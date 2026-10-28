import React, { type ComponentProps } from "react";
import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import { FlashcardsStudyLayout } from "../FlashcardsStudyLayout";

let mockMounts = 0;
let mockUnmounts = 0;
jest.mock("@edwardloopez/react-native-coachmark", () => ({
  CoachmarkAnchor: ({ children }: React.PropsWithChildren) => children,
}));
jest.mock("@/src/components/flashcards/KeyboardStudyScroll", () => ({
  KeyboardStudyScroll: ({ children }: React.PropsWithChildren) => children,
}));
jest.mock("../FlashcardsBoxesSection", () => ({
  FlashcardsBoxesSection: ({ hidden }: { hidden: boolean }) => {
    const React = jest.requireActual<typeof import("react")>("react");
    const { View } = jest.requireActual<typeof import("react-native")>("react-native");
    React.useEffect(() => {
      mockMounts += 1;
      return () => { mockUnmounts += 1; };
    }, []);
    return React.createElement(View, { testID: "boxes", accessibilityElementsHidden: hidden });
  },
}));

it("keeps landscape boxes mounted through keyboard entry and dismissal", () => {
  mockMounts = 0;
  mockUnmounts = 0;
  type Props = ComponentProps<typeof FlashcardsStudyLayout>;
  const props = {
    layout: {
      isLandscapeStudy: true,
      isTabletCenteredStudyLayout: true,
      boxesLayoutProps: {},
      studyLayout: { keyboardVisible: false },
      dock: {},
    },
    styles: {},
    boxes: {},
    cardSection: <Text>Card</Text>,
  } as unknown as Props;
  const app = render(<FlashcardsStudyLayout {...props} />);
  expect(mockMounts).toBe(1);
  expect(app.getByTestId("boxes").props.accessibilityElementsHidden).toBe(false);
  const withKeyboard = {
    ...props,
    layout: { ...props.layout, studyLayout: { ...props.layout.studyLayout, keyboardVisible: true } },
  };
  app.rerender(<FlashcardsStudyLayout {...withKeyboard} />);
  expect(app.getByTestId("boxes", { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
  app.rerender(<FlashcardsStudyLayout {...props} />);
  expect(app.getByTestId("boxes").props.accessibilityElementsHidden).toBe(false);
  expect(mockMounts).toBe(1);
  expect(mockUnmounts).toBe(0);
});
