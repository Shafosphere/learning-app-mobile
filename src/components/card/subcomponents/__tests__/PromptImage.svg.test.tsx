import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import { PromptImage } from "@/src/components/card/subcomponents/PromptImage";
import * as FileSystem from "expo-file-system/legacy";

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

const mockSvgXml = jest.fn(() => null);
const mockSvgUri = jest.fn(() => null);

jest.mock("react-native-svg", () => ({
  SvgXml: (props: Record<string, unknown>) => mockSvgXml(props),
  SvgUri: (props: Record<string, unknown>) => mockSvgUri(props),
}));

const mockedFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

describe("PromptImage SVG rendering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFileSystem.getInfoAsync.mockResolvedValue({ exists: true } as any);
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
});
