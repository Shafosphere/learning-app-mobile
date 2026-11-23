import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { StyleSheet, View } from "react-native";

import { CardImagePreviewContext } from "@/src/components/card/imagePreviewContext";
import { PromptImage } from "@/src/components/card/subcomponents/PromptImage";
import * as FileSystem from "expo-file-system/legacy";
import { getPreloadedImage } from "@/src/features/flashcards/flashcardImagePreload";
import { useContentImage } from "@/Content/runtime/useContentImage";
import { invalidateImages } from "@/Content/runtime/images";
import { Image } from "expo-image";
import { MissingImage } from "@/Content/runtime/MissingImage";

jest.mock("@/Content/runtime/images", () => ({ invalidateImages: jest.fn() }));

jest.mock("@/Content/runtime/useContentImage", () => ({
  useContentImage: jest.fn((uri: string) => ({ uri, loading: false })),
}));

jest.mock("@/Content/runtime/MissingImage", () => ({
  MissingImage: () => null,
}));

jest.mock("expo-image", () => ({
  Image: () => null,
}));

jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
}));

jest.mock("@/src/contexts/SettingsContext", () => ({
  useSettings: () => ({
    colors: {
      border: "#00000033",
      headline: "#111111",
    },
    flashcardsImageFrameEnabled: false,
  }),
}));

jest.mock("@/src/features/flashcards/flashcardImagePreload", () => ({
  getPreloadedImage: jest.fn(() => null),
}));

const mockSvgXml = jest.fn((props: Record<string, unknown>) => null);
const mockSvgUri = jest.fn((props: Record<string, unknown>) => null);

jest.mock("react-native-svg", () => ({
  SvgXml: (props: Record<string, unknown>) => mockSvgXml(props),
  SvgUri: (props: Record<string, unknown>) => mockSvgUri(props),
}));

const mockedFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
const mockedGetPreloadedImage = getPreloadedImage as jest.Mock;
const mockedUseContentImage = jest.mocked(useContentImage);

const findFrameOpacity = (screen: ReturnType<typeof render>) =>
  screen.UNSAFE_getAllByType(View).find((node) => {
    const style = node.props.style as { opacity?: number } | undefined;
    return typeof style?.opacity === "number";
  })?.props.style.opacity;

const findFrameStyle = (screen: ReturnType<typeof render>) =>
  screen.UNSAFE_getAllByType(View).find((node) => {
    const style = node.props.style as { opacity?: number } | undefined;
    return typeof style?.opacity === "number";
  })?.props.style as { width: number; height: number } | undefined;

describe("PromptImage SVG rendering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFileSystem.getInfoAsync.mockResolvedValue({ exists: true } as any);
    mockedGetPreloadedImage.mockReturnValue(null);
    mockedUseContentImage.mockImplementation((uri) => ({ uri, loading: false }));
  });

  it.each(["file:///custom/tree.jpg", "https://example.com/tree.jpg"])(
    "renders a failed custom image again after retry without a loading transition (%s)",
    (uri) => {
      const warning = jest.spyOn(console, "warn").mockImplementation(() => {});
      mockedGetPreloadedImage.mockReturnValue({ kind: "bitmap", uri, ratio: 1 });
      const screen = render(<PromptImage uri={uri} imageStyle={{ height: 140 }} />);

      fireEvent(screen.UNSAFE_getByType(Image), "error", { error: "Failed to load" });
      expect(screen.UNSAFE_queryByType(Image)).toBeNull();

      fireEvent(screen.UNSAFE_getByType(MissingImage), "retry");

      expect(screen.UNSAFE_queryByType(MissingImage)).toBeNull();
      expect(screen.UNSAFE_getByType(Image).props.source).toEqual({ uri });
      warning.mockRestore();
    },
  );

  it("retries a failed managed image once, then shows recovery instead of a blank slot", () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockedGetPreloadedImage.mockReturnValue({ kind: "bitmap", uri: "file:///cache/tree.jpg", ratio: 1 });
    mockedUseContentImage.mockReturnValue({ uri: "file:///cache/tree.jpg", loading: false });
    const props = { uri: "asset://images_trees/tree.jpg", imageStyle: { height: 140 } };
    const screen = render(<PromptImage {...props} />);
    fireEvent(screen.UNSAFE_getByType(Image), "error", { error: "ENOENT" });
    expect(invalidateImages).toHaveBeenCalledTimes(1);
    expect(screen.UNSAFE_getByType(MissingImage)).toBeTruthy();

    mockedUseContentImage.mockReturnValue({ uri: null, loading: true });
    screen.rerender(<PromptImage {...props} />);
    mockedUseContentImage.mockReturnValue({ uri: "file:///cache/tree.jpg", loading: false });
    screen.rerender(<PromptImage {...props} />);
    fireEvent(screen.UNSAFE_getByType(Image), "error", { error: "ENOENT" });
    expect(invalidateImages).toHaveBeenCalledTimes(1);
    expect(screen.UNSAFE_getByType(MissingImage)).toBeTruthy();
    warning.mockRestore();
  });

  it.each([true, false])("preserves the image slot while URI is unavailable (loading=%s)", (loading) => {
    mockedUseContentImage.mockReturnValue({ uri: null, loading });
    const onHeightChange = jest.fn();
    const props = {
      uri: "asset://images_birds/stork.webp",
      imageStyle: [{ width: "90%" as const, height: 140 }, { marginTop: 8 }],
      initialSlotWidth: 260,
      maxHeight: 140,
      onHeightChange,
    };
    const screen = render(<PromptImage {...props} />);
    const slot = screen.UNSAFE_getAllByType(View)[0];
    expect(StyleSheet.flatten(slot.props.style)).toMatchObject({
      width: "90%", height: 140, maxHeight: 140, marginTop: 8,
    });
    fireEvent(slot, "layout", { nativeEvent: { layout: { width: 260, height: 140 } } });
    expect(onHeightChange).toHaveBeenCalledWith(140);

    mockedUseContentImage.mockReturnValue({ uri: "file://images/stork.webp", loading: false });
    mockedGetPreloadedImage.mockReturnValue({ kind: "bitmap", ratio: 1, uri: "file://images/stork.webp" });
    screen.rerender(<PromptImage {...props} />);
    expect(StyleSheet.flatten(screen.UNSAFE_getAllByType(View)[0].props.style)).toMatchObject({
      width: "90%", height: 140, marginTop: 8,
    });
  });

  it("uses initial width and default height while resolving an image without explicit dimensions", () => {
    mockedUseContentImage.mockReturnValue({ uri: null, loading: true });
    const screen = render(<PromptImage uri="asset://images_birds/stork.webp" imageStyle={{}} initialSlotWidth={260} maxHeight={40} />);
    expect(StyleSheet.flatten(screen.UNSAFE_getAllByType(View)[0].props.style)).toMatchObject({
      width: 260, height: 64, maxHeight: 40,
    });
  });

  it("renders a preloaded bitmap visibly on its first mount", () => {
    mockedGetPreloadedImage.mockReturnValue({
      kind: "bitmap",
      uri: "file://images/cached.png",
      ratio: 2,
    });

    const screen = render(
      <PromptImage
        uri="file://images/cached.png"
        imageStyle={{ width: 120, height: 80 }}
      />,
    );

    expect(findFrameOpacity(screen)).toBe(1);
    expect(mockedFileSystem.getInfoAsync).not.toHaveBeenCalled();
  });

  it("reserves a transparent image slot at its final height while an SVG loads", async () => {
    let finishLoading!: (xml: string) => void;
    mockedFileSystem.readAsStringAsync.mockReturnValue(new Promise<string>((resolve) => {
      finishLoading = resolve;
    }));
    const screen = render(
      <PromptImage uri="file://images/slow.svg" imageStyle={{ width: "90%", height: 140, maxHeight: 140 }} initialSlotWidth={260} />,
    );
    const slotHeight = () => screen.UNSAFE_getAllByType(View)[0].props.style.height;
    expect(slotHeight()).toBe(140);
    expect(findFrameOpacity(screen)).toBe(0);
    await waitFor(() => expect(mockedFileSystem.readAsStringAsync).toHaveBeenCalled());

    await act(async () => finishLoading('<svg viewBox="0 0 400 100"><path d="M0 0h400v100H0z"/></svg>'));
    expect(findFrameOpacity(screen)).toBe(1);
    expect(slotHeight()).toBe(140);
  });

  it("preserves the configured height of a portrait bird image", () => {
    mockedGetPreloadedImage.mockReturnValue({
      kind: "bitmap",
      uri: "file://images/bird.webp",
      ratio: 0.65,
    });
    const screen = render(
      <PromptImage
        uri="file://images/bird.webp"
        imageStyle={{ width: "90%", height: 238 }}
        initialSlotWidth={295}
      />,
    );
    const slot = screen.UNSAFE_getAllByType(View)[0];
    expect(slot.props.style.height).toBe(238);
    expect(findFrameStyle(screen)?.height).toBeCloseTo(238);
    fireEvent(slot, "layout", {
      nativeEvent: { layout: { width: 295, height: 238 } },
    });
  });

  it("limits a preloaded wide image before the first layout measurement", () => {
    mockedGetPreloadedImage.mockReturnValue({
      kind: "bitmap",
      uri: "file://images/bird.webp",
      ratio: 1.8,
    });

    const screen = render(
      <PromptImage
        uri="file://images/bird.webp"
        imageStyle={{ width: "90%", height: 238 }}
        initialSlotWidth={295}
      />,
    );

    expect(findFrameStyle(screen)?.width).toBe(295);
    expect(findFrameStyle(screen)?.height).toBeCloseTo(295 / 1.8);

    fireEvent(screen.UNSAFE_getAllByType(View)[0], "layout", {
      nativeEvent: { layout: { width: 280 } },
    });

    expect(findFrameStyle(screen)?.width).toBe(280);
  });

  it("uses preloaded SVG XML during the first render without reading the file", () => {
    mockedGetPreloadedImage.mockReturnValue({
      kind: "svg",
      uri: "file://images/cached.svg",
      xml: '<svg viewBox="0 0 20 10"><path fill="#d40000" d="M0 0h20v10H0z"/></svg>',
      ratio: 2,
    });

    const screen = render(
      <PromptImage
        uri="file://images/cached.svg"
        imageStyle={{ width: 120, height: 80 }}
      />,
    );

    expect(mockSvgXml).toHaveBeenCalledTimes(1);
    expect(findFrameOpacity(screen)).toBe(1);
    expect(mockedFileSystem.getInfoAsync).not.toHaveBeenCalled();
  });

  it("keeps a cached bitmap visible after remounting the same URI", () => {
    mockedGetPreloadedImage.mockReturnValue({
      kind: "bitmap",
      uri: "file://images/same.png",
      ratio: 1,
    });
    const props = {
      uri: "file://images/same.png",
      imageStyle: { width: 80, height: 80 },
    };

    const first = render(<PromptImage {...props} />);
    expect(findFrameOpacity(first)).toBe(1);
    first.unmount();

    const second = render(<PromptImage {...props} />);
    expect(findFrameOpacity(second)).toBe(1);
  });

  it("inlines class styles for local SVGs before rendering", async () => {
    mockedFileSystem.readAsStringAsync.mockResolvedValue(
      [
        '<svg viewBox="0 0 1260 630">',
        "<defs>",
        "<style>.cls-4{fill:#d40000}.cls-8{fill:#ffd200}</style>",
        "</defs>",
        '<path class="cls-4" d="M0 180h1260v270H0z"/>',
        '<path class="cls-8" d="M152.88 218.67h10z"/>',
        "</svg>",
      ].join("")
    );

    render(
      <PromptImage
        uri="file://images/zw.svg"
        imageStyle={{ width: 120, height: 80 }}
      />
    );

    await waitFor(() => {
      expect(mockSvgXml).toHaveBeenCalled();
    });

    const renderedXml = mockSvgXml.mock.calls.at(-1)?.[0]?.xml as string;
    expect(renderedXml).toContain('style="fill:#d40000"');
    expect(renderedXml).toContain('style="fill:#ffd200"');
    expect(renderedXml).toContain("<style>");
  });

  it("preserves non-inlined SVG style rules", async () => {
    mockedFileSystem.readAsStringAsync.mockResolvedValue(
      [
        '<svg viewBox="0 0 20 10">',
        "<defs>",
        "<style>.flag{fill:#d40000}path{stroke:#000000}.flag path{stroke-width:2}</style>",
        "</defs>",
        '<path class="flag" d="M0 0h20v10H0z"/>',
        "</svg>",
      ].join("")
    );

    render(
      <PromptImage
        uri="file://images/flag.svg"
        imageStyle={{ width: 120, height: 80 }}
      />
    );

    await waitFor(() => {
      expect(mockSvgXml).toHaveBeenCalled();
    });

    const renderedXml = mockSvgXml.mock.calls.at(-1)?.[0]?.xml as string;
    expect(renderedXml).toContain('style="fill:#d40000"');
    expect(renderedXml).toContain("path{stroke:#000000}");
    expect(renderedXml).toContain(".flag path{stroke-width:2}");
  });

  it("adds a viewBox for fixed-size SVGs that omit it", async () => {
    mockedFileSystem.readAsStringAsync.mockResolvedValue(
      '<svg width="800" height="800"><circle cx="400" cy="400" r="400"/></svg>'
    );

    render(
      <PromptImage
        uri="file://images/B-1.svg"
        imageStyle={{ width: 120, height: 120 }}
      />
    );

    await waitFor(() => {
      expect(mockSvgXml).toHaveBeenCalled();
    });

    const renderedXml = mockSvgXml.mock.calls.at(-1)?.[0]?.xml as string;
    expect(renderedXml).toContain('viewBox="0 0 800 800"');
  });

  it("decodes base64 data SVGs before rendering as XML", async () => {
    const xml = '<svg viewBox="0 0 20 10"><path fill="#d40000" d="M0 0h20v10H0z"/></svg>';
    const uri = `data:image/svg+xml;base64,${btoa(xml)}`;

    render(
      <PromptImage
        uri={uri}
        imageStyle={{ width: 120, height: 80 }}
      />
    );

    await waitFor(() => {
      expect(mockSvgXml).toHaveBeenCalled();
    });

    const renderedXml = mockSvgXml.mock.calls.at(-1)?.[0]?.xml as string;
    expect(renderedXml).toContain("<svg");
    expect(renderedXml).toContain('fill="#d40000"');
    expect(renderedXml).not.toContain("PHN2Zy");
  });

  it("preserves commas inside non-base64 data SVG content", async () => {
    const xml = '<svg viewBox="0 0 20 10"><path d="M0,0 L20,10"/></svg>';
    const uri = `data:image/svg+xml,${xml}`;

    render(
      <PromptImage
        uri={uri}
        imageStyle={{ width: 120, height: 80 }}
      />
    );

    await waitFor(() => {
      expect(mockSvgXml).toHaveBeenCalled();
    });

    const renderedXml = mockSvgXml.mock.calls.at(-1)?.[0]?.xml as string;
    expect(renderedXml).toContain('d="M0,0 L20,10"');
  });
  it("opens the resolved file instead of the managed asset reference", () => {
    const open = jest.fn();
    mockedUseContentImage.mockReturnValue({ uri: "file:///cache/tree.webp", loading: false });
    mockedGetPreloadedImage.mockReturnValue({ kind: "bitmap", uri: "file:///cache/tree.webp", ratio: 2 });
    const screen = render(<CardImagePreviewContext.Provider value={open}>
      <PromptImage uri="asset://images_trees/tree.webp" imageStyle={{ height: 140 }} />
    </CardImagePreviewContext.Provider>);
    fireEvent.press(screen.getByRole("button"));
    expect(open).toHaveBeenCalledWith({ uri: "file:///cache/tree.webp", ratio: 2, isSvg: false, svgXml: null });
  });

  it("passes the exact prepared SVG to the preview renderer", () => {
    const open = jest.fn();
    mockedGetPreloadedImage.mockReturnValue({ kind: "svg", uri: "file:///flag.svg", xml: '<svg viewBox="0 0 20 10"><path fill="red" d="M0 0L20 10"/></svg>', ratio: 2 });
    const screen = render(<CardImagePreviewContext.Provider value={open}>
      <PromptImage uri="file:///flag.svg" imageStyle={{ height: 140 }} />
    </CardImagePreviewContext.Provider>);
    fireEvent.press(screen.getByRole("button"));
    expect(open).toHaveBeenCalledWith(expect.objectContaining({
      isSvg: true, ratio: 2, svgXml: mockSvgXml.mock.calls.at(-1)?.[0]?.xml,
    }));
  });

  it("does not open a missing or still-loading image", () => {
    const open = jest.fn();
    mockedUseContentImage.mockReturnValue({ uri: null, loading: true });
    const screen = render(<CardImagePreviewContext.Provider value={open}>
      <PromptImage uri="asset://images_trees/tree.webp" imageStyle={{ height: 140 }} />
    </CardImagePreviewContext.Provider>);
    expect(screen.queryByRole("button")).toBeNull();
    expect(open).not.toHaveBeenCalled();
  });

  it("waits for bitmap loading and uses its actual dimensions in the preview", async () => {
    const open = jest.fn();
    mockedFileSystem.getInfoAsync.mockRejectedValueOnce(new Error("Remote URI"));
    const screen = render(<CardImagePreviewContext.Provider value={open}>
      <PromptImage uri="https://example.com/tree.webp" imageStyle={{ height: 140 }} />
    </CardImagePreviewContext.Provider>);
    await act(async () => {});
    fireEvent.press(screen.getByRole("button"));
    expect(open).not.toHaveBeenCalled();
    fireEvent(screen.UNSAFE_getByType(Image), "load", { source: { width: 900, height: 600 } });
    fireEvent.press(screen.getByRole("button"));
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ ratio: 1.5 }));
  });

});
