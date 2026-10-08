import { render } from "@testing-library/react-native";
import React from "react";
import BoxSkin from "../BoxSkin";
import {
  BOX_FACE_ASSETS,
  getFaceDurationForGameplayEvent,
  getFaceForGameplayEvent,
  pickInactiveFace,
  type Face,
} from "../boxFaces";

const mockUseSettings = jest.fn();

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: () => mockUseSettings(),
}));

jest.mock("../BoxSkin.styles", () => ({
  useBoxSkinStyles: () => ({
    containerSkin: {},
    activeBox: {},
    caroPosition: {},
    skin: {},
    cardsRow: {},
    face: {},
    card1: {},
    card2: {},
    card3: {},
  }),
}));

describe("BoxSkin", () => {
  beforeEach(() => {
    mockUseSettings.mockClear();
    mockUseSettings.mockReturnValue({ showBoxFaces: true });
  });

  it("skips unchanged artwork during parent updates and refreshes face and count changes", () => {
    const screen = render(<BoxSkin wordCount={18} face="nice" />);
    mockUseSettings.mockClear();
    screen.rerender(<BoxSkin wordCount={18} face="nice" />);
    expect(mockUseSettings).not.toHaveBeenCalled();

    screen.rerender(<BoxSkin wordCount={21} face="love" />);
    expect(screen.getByTestId("box-skin-face")).toHaveProp("source", BOX_FACE_ASSETS.love);
    expect(screen.getByLabelText("Pudełko z 21 słowami, nastrój: love")).toBeTruthy();
  });

  it.each(Object.entries(BOX_FACE_ASSETS) as [Face, number][])(
    "renders the correct asset for %s",
    (face, asset) => {
      const { getByTestId } = render(
        <BoxSkin wordCount={18} face={face} isActive={face === "happy"} />
      );

      expect(getByTestId("box-skin-face")).toHaveProp("source", asset);
    }
  );

  it("does not render the face when box faces are disabled", () => {
    mockUseSettings.mockReturnValue({ showBoxFaces: false });

    const { queryByTestId } = render(<BoxSkin wordCount={18} face="love" />);

    expect(queryByTestId("box-skin-face")).toBeNull();
  });

  it("can force face visibility for the navbar mascot", () => {
    mockUseSettings.mockReturnValue({ showBoxFaces: false });

    const { getByTestId } = render(
      <BoxSkin wordCount={40} face="nice" showFace accessible={false} />
    );

    expect(getByTestId("box-skin-face")).toBeTruthy();
  });
});

describe("boxFaces helpers", () => {
  it("maps gameplay events to the expected faces", () => {
    expect(getFaceForGameplayEvent("selected")).toBe("surprised");
    expect(getFaceForGameplayEvent("correct")).toBe("blushed");
    expect(getFaceForGameplayEvent("success")).toBe("love");
    expect(getFaceForGameplayEvent("wrong")).toBe("sad");
    expect(getFaceForGameplayEvent("meltdown")).toBe("crying");
    expect(getFaceForGameplayEvent("blocked")).toBe("angry");
  });

  it("returns stable idle variants based on the provided random value", () => {
    expect(pickInactiveFace(0.1)).toBe("nice");
    expect(pickInactiveFace(0.9)).toBe("blink");
  });

  it("returns sensible durations for transient gameplay faces", () => {
    expect(getFaceDurationForGameplayEvent("selected")).toBeGreaterThan(0);
    expect(getFaceDurationForGameplayEvent("success")).toBeGreaterThan(
      getFaceDurationForGameplayEvent("correct")
    );
  });
});
