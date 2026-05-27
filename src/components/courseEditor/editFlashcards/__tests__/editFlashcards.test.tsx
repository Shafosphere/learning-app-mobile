import React from "react";
import { render } from "@testing-library/react-native";
import { View } from "react-native";

import { ManualCardsEditor } from "../editFlashcards";
import type { ManualCard } from "@/src/hooks/useManualCardsForm";

const mockPromptImage = jest.fn(
  ({ uri }: { uri: string }) => <View testID="svg-image-preview" accessibilityLabel={uri} />
);

jest.mock("@/src/components/card/subcomponents/PromptImage", () => ({
  PromptImage: (props: { uri: string }) => mockPromptImage(props),
}));

jest.mock("@expo/vector-icons/Feather", () => () => null);
jest.mock("@expo/vector-icons/FontAwesome", () => () => null);
jest.mock("@expo/vector-icons/FontAwesome5", () => () => null);

jest.mock("@/src/components/courseEditor/editFlashcards/editFlashcards-styles", () => ({
  useStyles: () => ({
    card: {},
    cardFirst: {},
    number: {},
    inputContainer: {},
    flipRow: {},
    lockcontainer: {},
    icon: {},
    iconFlipDeactive: {},
    cardinput: {},
    cardInputPlaceholderState: {},
    cardPlaceholder: { color: "#777777" },
    cardDivider: {},
    imagesRow: {},
    imagesRowSingle: {},
    imageSlot: {},
    imageSlotFull: {},
    imagePreview: {},
    imageThumb: { width: "100%", height: "100%" },
    imagePlaceholder: {},
    imageOverlayClearButton: {},
    imageOverlayClearIcon: { color: "#ffffff" },
    answersContainer: {},
    answerRow: {},
    answerIndex: {},
    answerInput: {},
    answerInputPlaceholderState: {},
    explanationContainer: {},
    explanationLabel: {},
    explanationInput: {},
    explanationInputPlaceholderState: {},
    cardActions: {},
    cardActionButton: {},
    cardActionIcon: {},
    removeButtonDisabled: {},
    cardActionButtonAddImage: {},
    imageClearButton: {},
    imageClearIcon: {},
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const svgCard: ManualCard = {
  id: "imported-svg",
  front: "",
  answers: ["United Arab Emirates"],
  flipped: false,
  type: "text",
  imageFront: "file://images/ae.svg",
  imageBack: null,
};

describe("ManualCardsEditor imported image previews", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders an imported SVG through the SVG-capable prompt renderer", () => {
    const screen = render(
      <ManualCardsEditor
        manualCards={[svgCard]}
        styles={{} as never}
        onCardImageChange={jest.fn()}
      />
    );

    expect(screen.getByTestId("svg-image-preview")).toHaveProp(
      "accessibilityLabel",
      "file://images/ae.svg"
    );
    expect(mockPromptImage).toHaveBeenCalledWith(
      expect.objectContaining({ uri: "file://images/ae.svg" })
    );
  });
});
