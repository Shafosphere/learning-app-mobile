import React from "react";
import { render } from "@testing-library/react-native";
import { Text, TextInput } from "react-native";

import { CardHint } from "../CardHint";

function mockButton({ text }: { text: string }) {
  return <Text>{text}</Text>;
}

jest.mock("@edwardloopez/react-native-coachmark", () => ({
  CoachmarkAnchor: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/src/components/card/card-styles", () => ({ useStyles: () => ({}) }));
jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: () => ({ colors: { paragraph: "#555" } }),
}));
jest.mock("@/src/components/button/button", () => mockButton);
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("CardHint accessibility", () => {
  it("names hint editor and explains when Save is available", () => {
    const screen = render(
      <CardHint
        currentHint={null}
        isEditingHint
        hintDraft=""
        setHintDraft={jest.fn()}
        startHintEditing={jest.fn()}
        cancelHintEditing={jest.fn()}
        finishHintEditing={jest.fn()}
        deleteHint={jest.fn()}
        hintActionsStyle={{}}
        shouldMarqueeHint={false}
        selectedItem={{ id: 1 }}
        onHintUpdate={jest.fn()}
        onHintInputBlur={jest.fn()}
      />,
    );

    const input = screen.UNSAFE_getByType(TextInput);
    expect(input.props.accessibilityLabel).toBe("flashcards.card.hint.inputLabel");
    expect(input.props.accessibilityHint).toBe("flashcards.card.hint.inputHint");
  });
});
