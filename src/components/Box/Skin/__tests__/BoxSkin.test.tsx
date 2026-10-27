import { render } from "@testing-library/react-native";
import React from "react";
import { Image } from "react-native";
import BoxSkin from "../BoxSkin";
import {
  BOX_EYE_ASSETS,
  BOX_EYEBROW_ASSETS,
  BOX_FACE_EFFECT_ASSETS,
  BOX_FACE_PRESETS,
  BOX_MOUTH_ASSETS,
  getFaceDurationForGameplayEvent,
  getFaceForGameplayEvent,
  resolveBoxFace,
  getIdleFaceForBox,
  pickBoxSelectionFace,
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

  it("layers custom content inside the box instead of source artwork or cards", () => {
    const contentSource = { uri: "custom-clock.svg" };
    const fallbackSource = { uri: "unused-content.png" };
    const screen = render(
      <BoxSkin
        wordCount={40}
        face="sleep"
        showFace={false}
        content={<Image source={contentSource} />}
        contentSource={fallbackSource}
      />
    );
    const sources = screen.UNSAFE_getAllByType(Image).map((node) => node.props.source);
    expect(sources).toEqual([
      require("@/assets/mascot/box/body/top-box.png"),
      contentSource,
      require("@/assets/mascot/box/body/bottom-box.png"),
    ]);

    screen.rerender(
      <BoxSkin wordCount={40} face="sleep" showFace={false} contentSource={fallbackSource} />
    );
    expect(screen.UNSAFE_getAllByType(Image).map((node) => node.props.source)).toContainEqual(fallbackSource);

    screen.rerender(<BoxSkin wordCount={40} face="sleep" showFace={false} />);
    expect(screen.UNSAFE_getAllByType(Image)).toHaveLength(5);
  });

  it("skips unchanged artwork during parent updates and refreshes face and count changes", () => {
    const screen = render(<BoxSkin wordCount={18} face="nice" />);
    mockUseSettings.mockClear();
    screen.rerender(<BoxSkin wordCount={18} face="nice" />);
    expect(mockUseSettings).not.toHaveBeenCalled();

    screen.rerender(<BoxSkin wordCount={21} face="love" />);
    expect(screen.getByTestId("box-skin-face-eyes")).toHaveProp("source", BOX_EYE_ASSETS.heart);
    expect(screen.getByLabelText("Pudełko z 21 słowami, nastrój: love")).toBeTruthy();
  });

  it.each(Object.keys(BOX_FACE_PRESETS) as Face[])(
    "renders the eyes and mouth for the %s preset",
    (face) => {
      const { getByTestId } = render(
        <BoxSkin wordCount={18} face={face} isActive={face === "happy"} />
      );

      const parts = BOX_FACE_PRESETS[face];
      expect(getByTestId("box-skin-face-eyes")).toHaveProp("source", BOX_EYE_ASSETS[parts.eyes]);
      expect(getByTestId("box-skin-face-mouth")).toHaveProp("source", BOX_MOUTH_ASSETS[parts.mouth]);
    }
  );

  it("removes crying decorations when the face changes to happy", () => {
    const screen = render(<BoxSkin wordCount={18} face="crying" />);

    expect(screen.getByTestId("box-skin-face-eyebrows")).toHaveProp("source", BOX_EYEBROW_ASSETS.sad);
    expect(screen.getByTestId("box-skin-face-tears")).toHaveProp("source", BOX_FACE_EFFECT_ASSETS.tears);

    screen.rerender(<BoxSkin wordCount={18} face="happy" />);

    expect(screen.queryByTestId("box-skin-face-eyebrows")).toBeNull();
    expect(screen.queryByTestId("box-skin-face-tears")).toBeNull();
    expect(screen.getByTestId("box-skin-face-eyes")).toHaveProp("source", BOX_EYE_ASSETS.happy);
  });

  it("combines custom parts and can remove decorations from the preset", () => {
    const screen = render(
      <BoxSkin
        wordCount={18}
        face="crying"
        faceParts={{ eyes: "sparkle", mouth: "owo", eyebrows: null, tears: false, blush: true }}
      />
    );

    expect(screen.getByTestId("box-skin-face-eyes")).toHaveProp("source", BOX_EYE_ASSETS.sparkle);
    expect(screen.getByTestId("box-skin-face-mouth")).toHaveProp("source", BOX_MOUTH_ASSETS.owo);
    expect(screen.getByTestId("box-skin-face-blush")).toHaveProp("source", BOX_FACE_EFFECT_ASSETS.blush);
    expect(screen.queryByTestId("box-skin-face-eyebrows")).toBeNull();
    expect(screen.queryByTestId("box-skin-face-tears")).toBeNull();

    screen.rerender(<BoxSkin wordCount={18} face="crying" />);
    expect(screen.getByTestId("box-skin-face-eyebrows")).toBeTruthy();
    expect(screen.getByTestId("box-skin-face-tears")).toBeTruthy();
    expect(screen.queryByTestId("box-skin-face-blush")).toBeNull();
  });

  it("keeps the normal left eye and uses the wink asset for the right eye", () => {
    const screen = render(<BoxSkin wordCount={18} face="blink" />);
    const leftEye = screen.getByTestId("box-skin-face-left-eye");

    expect(leftEye).toHaveStyle({ width: "50%", overflow: "hidden" });
    expect(screen.getByTestId("box-skin-face-left-eye-image")).toHaveProp("source", BOX_EYE_ASSETS.normal);
    expect(screen.getByTestId("box-skin-face-left-eye-image")).toHaveStyle({ width: "200%" });
    expect(screen.getByTestId("box-skin-face-eyes")).toHaveProp("source", BOX_EYE_ASSETS.blink);

    screen.rerender(<BoxSkin wordCount={18} face="nice" />);
    expect(screen.queryByTestId("box-skin-face-left-eye")).toBeNull();
  });

  it("renders the sleep decoration and allows an explicit visibility opt-out", () => {
    const screen = render(<BoxSkin wordCount={18} face="sleep" />);
    expect(screen.getByTestId("box-skin-face-zzz")).toHaveProp("source", BOX_FACE_EFFECT_ASSETS.zzz);

    screen.rerender(<BoxSkin wordCount={18} face="sleep" showFace={false} />);
    expect(screen.queryByTestId("box-skin-face")).toBeNull();
    expect(screen.queryByTestId("box-skin-face-zzz")).toBeNull();
  });

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
    expect(getFaceForGameplayEvent("correct")).toBe("happy");
    expect(getFaceForGameplayEvent("success")).toBe("love");
    expect(getFaceForGameplayEvent("wrong")).toBe("sad");
    expect(getFaceForGameplayEvent("meltdown")).toBe("encouraging");
    expect(getFaceForGameplayEvent("blocked")).toBe("owo");
  });

  it("uses a calm face for both active and inactive boxes", () => {
    expect(resolveBoxFace({ isActive: false })).toBe("nice");
    expect(resolveBoxFace({ isActive: true })).toBe("nice");
  });

  it("returns sensible durations for transient gameplay faces", () => {
    expect(getFaceDurationForGameplayEvent("selected")).toBeGreaterThan(0);
    expect(getFaceDurationForGameplayEvent("success")).toBeGreaterThan(
      getFaceDurationForGameplayEvent("correct")
    );
  });
});


describe("box personalities and manual selection", () => {
  it.each([
    ["boxZero", "owo"], ["boxOne", "nice"], ["boxTwo", "ez"],
    ["boxThree", "cheerful"], ["boxFour", "sparkle"],
  ] as const)("keeps the %s personality for empty and populated boxes", (box, face) => {
    expect(getIdleFaceForBox(box, 0)).toBe(face);
    expect(getIdleFaceForBox(box, 7)).toBe(face);
    expect(resolveBoxFace({ box, wordCount: 7, isActive: true })).toBe(face);
    expect(resolveBoxFace({ box, wordCount: 0, isActive: false })).toBe(face);
  });

  it("uses sleep only for the empty final box and respects explicit faces", () => {
    expect(getIdleFaceForBox("boxFive", 0)).toBe("sleep");
    expect(getIdleFaceForBox("boxFive", 1)).toBe("love");
    expect(resolveBoxFace({ box: "boxFive", wordCount: 0, isActive: true })).toBe("sleep");
    expect(resolveBoxFace({ box: "boxFive", wordCount: 1, isActive: false })).toBe("love");
    expect(resolveBoxFace({ box: "boxFive", isActive: true, idleFace: "cheerful" })).toBe("cheerful");
    expect(resolveBoxFace({ box: "boxFive", isActive: true, transientFace: "sad", idleFace: "cheerful" })).toBe("sad");
  });

  it.each([
    [0, "surprised"], [0.749999, "surprised"], [0.75, "owo"], [0.999999, "owo"],
  ] as const)("maps random value %s to %s", (value, face) => {
    expect(pickBoxSelectionFace(value)).toBe(face);
  });
});
