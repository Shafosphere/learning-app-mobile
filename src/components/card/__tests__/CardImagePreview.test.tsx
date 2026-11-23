import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Modal, View } from "react-native";
import { GestureViewer, useGestureViewerController } from "react-native-gesture-image-viewer";
import { CardImagePreview } from "../CardImagePreview";

jest.mock("react-native-gesture-image-viewer", () => ({
  GestureViewer: jest.fn(({ data, renderItem }) => renderItem(data[0])),
  useGestureViewerController: jest.fn(),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 20, left: 0, right: 0 }),
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("../subcomponents/PromptImageContent", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return { PromptImageContent: () => React.createElement(View, { testID: "preview-image-content" }) };
});

const image = { uri: "file:///tree.webp", isSvg: false, svgXml: null, ratio: 2 };

describe("CardImagePreview", () => {
  const rotate = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useGestureViewerController).mockReturnValue({ rotate } as any);
  });

  function open() {
    const onClose = jest.fn();
    const screen = render(<CardImagePreview image={image} onClose={onClose} />);
    const viewport = screen.UNSAFE_getAllByType(View).find((node) => node.props.onLayout)!;
    fireEvent(viewport, "layout", { nativeEvent: { layout: { width: 400, height: 600 } } });
    return { screen, onClose };
  }

  it("opens a single image in an overlay with bounded zoom and no paging or drag dismiss", () => {
    const { screen } = open();
    expect(screen.UNSAFE_getByType(Modal).props).toMatchObject({ transparent: true, visible: true });
    expect(screen.UNSAFE_getByType(GestureViewer).props).toMatchObject({
      data: [image], maxZoomScale: 6,
      horizontalSwipe: { enabled: false }, dismiss: { enabled: false },
    });
    expect(screen.getByTestId("preview-image-content")).toBeTruthy();
  });

  it("rotates through the library controller and remounts on reset", () => {
    const { screen } = open();
    fireEvent.press(screen.getByLabelText("cardImagePreview.rotate"));
    expect(rotate).toHaveBeenCalledWith(90);
    const firstId = screen.UNSAFE_getByType(GestureViewer).props.id;
    fireEvent.press(screen.getByLabelText("cardImagePreview.reset"));
    expect(screen.UNSAFE_getByType(GestureViewer).props.id).not.toBe(firstId);
  });

  it("dismisses backdrop taps and Back, while image taps stay open", () => {
    const { screen, onClose } = open();
    const tap = screen.UNSAFE_getByType(GestureViewer).props.onSingleTap;
    tap({ contentX: 200, contentY: 300 });
    expect(onClose).not.toHaveBeenCalled();
    tap({ contentX: 200, contentY: 100 });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent(screen.UNSAFE_getByType(Modal), "requestClose");
    fireEvent.press(screen.getByLabelText("cardImagePreview.close"));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("resets transformations when viewport orientation changes", () => {
    const { screen } = open();
    const firstId = screen.UNSAFE_getByType(GestureViewer).props.id;
    const viewport = screen.UNSAFE_getAllByType(View).find((node) => node.props.onLayout)!;
    fireEvent(viewport, "layout", { nativeEvent: { layout: { width: 600, height: 400 } } });
    expect(screen.UNSAFE_getByType(GestureViewer).props.id).not.toBe(firstId);
  });
});
