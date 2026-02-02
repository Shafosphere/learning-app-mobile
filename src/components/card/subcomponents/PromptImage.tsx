import { Image } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, ImageStyle, StyleProp, ViewStyle } from "react-native";
import { useSettings } from "@/src/contexts/SettingsContext";

type PromptImageProps = {
  uri: string;
  imageStyle: StyleProp<ImageStyle>; // traktuj to jako "slot" w fiszce
  onHeightChange?: (height: number) => void;
};

type SvgViewBox = { minX: number; minY: number; width: number; height: number };

const isSvgUri = (value: string) =>
  /\.svg(\?|#|$)/i.test(value) || value.startsWith("data:image/svg+xml");

const parseSvgViewBox = (xml: string): SvgViewBox | null => {
  const viewBoxMatch = xml.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const [minX, minY, width, height] = parts;
      if (width > 0 && height > 0) return { minX, minY, width, height };
    }
  }

  const widthMatch = xml.match(/width\s*=\s*["']([\d.]+)[^"']*["']/i);
  const heightMatch = xml.match(/height\s*=\s*["']([\d.]+)[^"']*["']/i);
  if (widthMatch && heightMatch) {
    const width = Number(widthMatch[1]);
    const height = Number(heightMatch[1]);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { minX: 0, minY: 0, width, height };
    }
  }
  return null;
};

export function PromptImage({ uri, imageStyle, onHeightChange }: PromptImageProps) {
  const { colors } = useSettings();
  const [svgViewBox, setSvgViewBox] = useState<SvgViewBox | null>(null);
  const [isSvg, setIsSvg] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSvg = async () => {
      try {
        // 1) szybka detekcja po URI (działa też dla remote)
        const uriLooksSvg = isSvgUri(uri);

        // data uri
        if (uri.startsWith("data:image/svg+xml")) {
          const raw = uri.split(",")[1] ?? "";
          const decoded = decodeURIComponent(raw);
          if (!cancelled) {
            setSvgViewBox(parseSvgViewBox(decoded));
            setIsSvg(true);
          }
          return;
        }

        // Jeśli to remote svg, nie czytaj FS — tylko ustaw isSvg
        if (uriLooksSvg && (uri.startsWith("http://") || uri.startsWith("https://"))) {
          if (!cancelled) {
            setSvgViewBox(null); // bez parsowania viewBox
            setIsSvg(true);
          }
          return;
        }

        // local file
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists) {
          if (!cancelled) {
            setSvgViewBox(null);
            setIsSvg(false);
          }
          return;
        }

        const xml = await FileSystem.readAsStringAsync(uri);
        const hasSvgTag = /<svg[\s>]/i.test(xml);
        const looksLikeSvg = uriLooksSvg || hasSvgTag;

        if (!cancelled) {
          if (looksLikeSvg) {
            setSvgViewBox(parseSvgViewBox(xml));
            setIsSvg(true);
          } else {
            setSvgViewBox(null);
            setIsSvg(false);
          }
        }
      } catch {
        if (!cancelled) {
          setSvgViewBox(null);
          setIsSvg(false);
        }
      }
    };

    void loadSvg();
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const slotStyle = useMemo(() => {
    // Slot w fiszce: centrowanie + to co przyszło z propsa
    const flat = (StyleSheet.flatten(imageStyle) || {}) as ViewStyle;

    return {
      ...flat,
      alignItems: "center",
      justifyContent: "center",
      // slot może być duży (np. pełna szerokość), ale ramka będzie tight
    } as ViewStyle;
  }, [imageStyle]);

  const frameStyle = useMemo(() => {
    // Ramka: zero flex rozciągania + aspectRatio
    const flat = (StyleSheet.flatten(imageStyle) || {}) as ImageStyle;

    const height =
      typeof flat.height === "number"
        ? flat.height
        : typeof flat.maxHeight === "number"
          ? flat.maxHeight
          : 64; // sensowny fallback

    const ratio = svgViewBox ? svgViewBox.width / svgViewBox.height : undefined;

    return {
      height,
      // jeśli nie mamy viewBox (np. remote), i tak border będzie działał,
      // tylko proporcja będzie zależeć od slotu; najlepiej wtedy podać height+width z zewnątrz
      aspectRatio: ratio ?? (flat.aspectRatio as number | undefined),

      borderWidth: isSvg ? 1 : 0,
      borderColor: colors.border ?? "#00000033",
      borderRadius: (flat.borderRadius as number | undefined) ?? 6,
      overflow: "hidden",

      // klucz: nie pozwól, żeby flex to rozciągał
      flexGrow: 0,
      flexShrink: 0,
      alignSelf: "center",
    } as ViewStyle;
  }, [colors.border, imageStyle, isSvg, svgViewBox]);

  return (
    <View style={slotStyle}>
      <View
        style={frameStyle}
        onLayout={({ nativeEvent }) => onHeightChange?.(nativeEvent.layout.height)}
      >
        <Image
          source={{ uri }}
          recyclingKey={uri}
          style={{ width: "100%", height: "100%" }}
          contentFit="contain"
          transition={0}
        />
      </View>
    </View>
  );
}
