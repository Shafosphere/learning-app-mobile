import { Image } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Image as RNImage,
  ImageStyle,
  StyleProp,
  ViewStyle,
} from "react-native";
import { useSettings } from "@/src/contexts/SettingsContext";
import { SvgUri, SvgXml } from "react-native-svg";

type PromptImageProps = {
  uri: string;
  imageStyle: StyleProp<ImageStyle>; // traktuj to jako "slot" w fiszce
  onHeightChange?: (height: number) => void;
};

type SvgViewBox = { minX: number; minY: number; width: number; height: number };

const isSvgUri = (value: string) =>
  /\.svg(\?|#|$)/i.test(value) || value.startsWith("data:image/svg+xml");

const isConstellationOutlineUri = (value: string): boolean =>
  /gwiazdozbiory\/.+-outline\.svg(\?|#|$)/i.test(value);

const isLikelyConstellationOutlineSvg = (xml: string, uri: string): boolean => {
  if (isConstellationOutlineUri(uri)) return true;
  const hasAnyStrokeColor =
    /stroke\s*:\s*#[0-9a-f]{3,8}/i.test(xml) ||
    /stroke\s*=\s*["']#[0-9a-f]{3,8}["']/i.test(xml);
  const hasClassedShapes = /class\s*=\s*["'](?:cls|st)[-_]?\d+/i.test(xml);
  const hasConstellationGeometry =
    /<(path|polyline|polygon|line)[\s>]/i.test(xml) &&
    /fill\s*:\s*none/i.test(xml);
  const hasKnownViewBox = /viewBox\s*=\s*["']0\s+0\s+360\s+360["']/i.test(xml);
  return hasAnyStrokeColor && hasClassedShapes && hasConstellationGeometry && hasKnownViewBox;
};

const boostConstellationOutlineContrast = (xml: string): string => {
  const bump = (raw: string): string => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return raw;
    const boosted = Math.max(parsed * 3.4, 3.2);
    return Number(boosted.toFixed(2)).toString();
  };

  let next = xml;
  next = next.replace(
    /stroke-width\s*:\s*([0-9]*\.?[0-9]+)(px)?/gi,
    (_m, value: string, unit: string | undefined) =>
      `stroke-width:${bump(value)}${unit ?? ""}`
  );
  next = next.replace(
    /stroke-width\s*=\s*["']([0-9]*\.?[0-9]+)["']/gi,
    (_m, value: string) => `stroke-width="${bump(value)}"`
  );
  // High-contrast neutral stroke for readability on any theme.
  next = next.replace(/stroke\s*:\s*#[0-9a-f]{3,8}/gi, "stroke:#F8FAFC");
  next = next.replace(/stroke\s*=\s*["']#[0-9a-f]{3,8}["']/gi, 'stroke="#F8FAFC"');
  return next;
};

const inlineSvgClassStyles = (xml: string): string => {
  const classStyles = new Map<string, string>();
  const styleBlocks = Array.from(xml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi));

  for (const block of styleBlocks) {
    const css = block[1] ?? "";
    const rules = Array.from(css.matchAll(/([^{}]+)\{([^}]*)\}/g));
    for (const rule of rules) {
      const selectorGroup = (rule[1] ?? "").trim();
      const declaration = (rule[2] ?? "").trim().replace(/\s+/g, " ");
      if (!selectorGroup || !declaration) continue;

      const selectors = selectorGroup
        .split(",")
        .map((selector) => selector.trim())
        .filter(Boolean);

      for (const selector of selectors) {
        const classMatch = selector.match(/^\.([a-z0-9_-]+)$/i);
        if (!classMatch) continue;
        const className = classMatch[1];
        const existing = classStyles.get(className);
        const merged = existing
          ? `${existing.replace(/;?\s*$/, "")}; ${declaration}`
          : declaration;
        classStyles.set(className, merged);
      }
    }
  }

  if (classStyles.size === 0) {
    return xml;
  }

  const withInlineStyles = xml.replace(
    /<([a-z][a-z0-9:_-]*)([^>]*?)\sclass=(["'])([^"']+)\3([^>]*)>/gi,
    (match, tagName: string, beforeClass: string, _quote: string, classValue: string, afterClass: string) => {
      const classes = String(classValue)
        .split(/\s+/)
        .map((name) => name.trim())
        .filter(Boolean);
      const inlineParts = classes
        .map((name) => classStyles.get(name))
        .filter((value): value is string => Boolean(value));
      if (inlineParts.length === 0) {
        return match;
      }

      const rawAttrs = `${beforeClass}${afterClass}`;
      const selfClosing = /\/\s*$/.test(rawAttrs);
      const attrsWithoutClosingSlash = rawAttrs.replace(/\/\s*$/, "");

      const existingStyleMatch = attrsWithoutClosingSlash.match(
        /\sstyle=(["'])([^"']*)\1/i
      );
      const existingStyle = existingStyleMatch?.[2]?.trim();
      const mergedStyle = [existingStyle, ...inlineParts].filter(Boolean).join("; ");

      const attrsWithoutStyle = attrsWithoutClosingSlash.replace(
        /\sstyle=(["'])([^"']*)\1/gi,
        ""
      );
      const closing = selfClosing ? " />" : ">";
      return `<${tagName}${attrsWithoutStyle} style="${mergedStyle}"${closing}`;
    }
  );

  return withInlineStyles.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
};

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
  const [isConstellationOutline, setIsConstellationOutline] = useState(false);
  const [svgViewBox, setSvgViewBox] = useState<SvgViewBox | null>(null);
  const [isSvg, setIsSvg] = useState(false);
  const [svgXml, setSvgXml] = useState<string | null>(null);
  const [rasterAspectRatio, setRasterAspectRatio] = useState<number | null>(null);

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
          const constellationMode = isLikelyConstellationOutlineSvg(decoded, uri);
          const normalized = inlineSvgClassStyles(decoded);
          const enhanced = constellationMode
            ? boostConstellationOutlineContrast(normalized)
            : normalized;
          if (!cancelled) {
            setSvgViewBox(parseSvgViewBox(enhanced));
            setIsSvg(true);
            setSvgXml(enhanced);
            setIsConstellationOutline(constellationMode);
          }
          return;
        }

        // Jeśli to remote svg, nie czytaj FS — tylko ustaw isSvg
        if (uriLooksSvg && (uri.startsWith("http://") || uri.startsWith("https://"))) {
          if (!cancelled) {
            setSvgViewBox(null); // bez parsowania viewBox
            setIsSvg(true);
            setSvgXml(null);
            setIsConstellationOutline(isConstellationOutlineUri(uri));
          }
          return;
        }

        // local file
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists) {
          if (!cancelled) {
            setSvgViewBox(null);
            setIsSvg(false);
            setSvgXml(null);
            setRasterAspectRatio(null);
            setIsConstellationOutline(false);
          }
          return;
        }

        const xml = await FileSystem.readAsStringAsync(uri);
        const constellationMode = isLikelyConstellationOutlineSvg(xml, uri);
        const normalizedXml = inlineSvgClassStyles(xml);
        const enhancedXml = constellationMode
          ? boostConstellationOutlineContrast(normalizedXml)
          : normalizedXml;
        const hasSvgTag = /<svg[\s>]/i.test(enhancedXml);
        const looksLikeSvg = uriLooksSvg || hasSvgTag;

        if (!cancelled) {
          if (looksLikeSvg) {
            setSvgViewBox(parseSvgViewBox(enhancedXml));
            setIsSvg(true);
            setSvgXml(enhancedXml);
            setRasterAspectRatio(null);
            setIsConstellationOutline(constellationMode);
          } else {
            setSvgViewBox(null);
            setIsSvg(false);
            setSvgXml(null);
            setIsConstellationOutline(false);
            RNImage.getSize(
              uri,
              (width, height) => {
                if (cancelled) return;
                if (width > 0 && height > 0) {
                  setRasterAspectRatio(width / height);
                  return;
                }
                setRasterAspectRatio(1);
              },
              () => {
                if (cancelled) return;
                setRasterAspectRatio(1);
              }
            );
          }
        }
      } catch {
        if (!cancelled) {
          setSvgViewBox(null);
          setIsSvg(false);
          setSvgXml(null);
          setRasterAspectRatio(1);
          setIsConstellationOutline(false);
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
    const baseHeight =
      typeof flat.height === "number"
        ? flat.height
        : typeof flat.maxHeight === "number"
          ? flat.maxHeight
          : undefined;
    const boostedHeight =
      typeof baseHeight === "number"
        ? Math.min(Math.max(baseHeight * 1.7, 190), 240)
        : undefined;

    return {
      ...flat,
      height: isConstellationOutline && boostedHeight ? boostedHeight : flat.height,
      maxHeight: isConstellationOutline && boostedHeight ? boostedHeight : flat.maxHeight,
      alignItems: "center",
      justifyContent: "center",
      // slot może być duży (np. pełna szerokość), ale ramka będzie tight
    } as ViewStyle;
  }, [imageStyle, isConstellationOutline]);

  const frameStyle = useMemo(() => {
    // Ramka: zero flex rozciągania + aspectRatio
    const flat = (StyleSheet.flatten(imageStyle) || {}) as ImageStyle;

    const baseHeight =
      typeof flat.height === "number"
        ? flat.height
        : typeof flat.maxHeight === "number"
          ? flat.maxHeight
          : 64; // sensowny fallback
    const height = isConstellationOutline
      ? Math.min(Math.max(baseHeight * 1.7, 190), 240)
      : baseHeight;

    const ratio = svgViewBox ? svgViewBox.width / svgViewBox.height : undefined;
    const resolvedRatio =
      ratio ??
      (flat.aspectRatio as number | undefined) ??
      (isSvg ? undefined : (rasterAspectRatio ?? 1));

    return {
      height,
      // jeśli nie mamy viewBox (np. remote), i tak border będzie działał,
      // tylko proporcja będzie zależeć od slotu; najlepiej wtedy podać height+width z zewnątrz
      aspectRatio: resolvedRatio,

      borderWidth: isSvg ? 1 : 0,
      borderColor: colors.border ?? "#00000033",
      backgroundColor: "transparent",
      borderRadius: (flat.borderRadius as number | undefined) ?? 6,
      overflow: "hidden",

      // klucz: nie pozwól, żeby flex to rozciągał
      flexGrow: 0,
      flexShrink: 0,
      alignSelf: "center",
    } as ViewStyle;
  }, [
    colors.border,
    imageStyle,
    isConstellationOutline,
    isSvg,
    rasterAspectRatio,
    svgViewBox,
  ]);

  return (
    <View style={slotStyle}>
      <View
        style={frameStyle}
        onLayout={({ nativeEvent }) => onHeightChange?.(nativeEvent.layout.height)}
      >
        {isSvg ? (
          svgXml ? (
            <SvgXml xml={svgXml} width="100%" height="100%" />
          ) : (
            <SvgUri uri={uri} width="100%" height="100%" />
          )
        ) : (
          <Image
            source={{ uri }}
            recyclingKey={uri}
            style={{ width: "100%", height: "100%" }}
            contentFit="contain"
            transition={0}
            onError={(event) => {
              console.warn("[PromptImage] failed to render image", {
                uri,
                error: event.error,
              });
            }}
          />
        )}
      </View>
    </View>
  );
}
