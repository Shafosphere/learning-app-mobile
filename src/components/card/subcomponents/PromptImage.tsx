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
import { getPreloadedImage } from "@/src/features/flashcards/flashcardImagePreload";

type PromptImageProps = {
  uri: string;
  imageStyle: StyleProp<ImageStyle>;
  onHeightChange?: (height: number) => void;
  renderMode?: "default" | "correction";
};

type SvgViewBox = { minX: number; minY: number; width: number; height: number };

type ImageRect = {
  width: number;
  height: number;
};

const DEFAULT_TARGET_HEIGHT = 64;
const SLOT_MAX_WIDTH_FRACTION = 1;

const isSvgUri = (value: string) =>
  /\.svg(\?|#|$)/i.test(value) || value.startsWith("data:image/svg+xml");

const isConstellationOutlineUri = (value: string): boolean =>
  /gwiazdozbiory\/.+-outline\.svg(\?|#|$)/i.test(value);

const isMergedConstellationSvg = (xml: string, uri: string): boolean =>
  /id\s*=\s*["']pattern-overlay["']/i.test(xml) ||
  /gwiazdozbiory\/generated\/.+-merged\.svg(\?|#|$)/i.test(uri);

const enhanceMergedConstellationSvg = (
  xml: string,
  outlineColor: string,
  overlayColor: string
): string => {
  let next = xml;

  next = next.replace(/stroke:\s*#FFFFFF/gi, `stroke:${outlineColor}`);
  next = next.replace(/fill:\s*#FFFFFF/gi, `fill:${outlineColor}`);

  next = next.replace(
    /stroke:\s*#FF5470;([^"]*?)stroke-width:\s*([0-9]*\.?[0-9]+)px;/gi,
    (_m, mid: string, rawWidth: string) => {
      const width = Number(rawWidth);
      const boosted = Number.isFinite(width) ? Math.max(width * 1.45, 4.6) : 4.6;
      return `stroke:#FF5470;${mid}stroke-width:${boosted.toFixed(3)}px;`;
    }
  );
  next = next.replace(/stroke:\s*#FF5470/gi, `stroke:${overlayColor}`);
  next = next.replace(/fill:\s*#FF5470/gi, `fill:${overlayColor}`);

  return next;
};

const isLikelyConstellationOutlineSvg = (xml: string, uri: string): boolean => {
  if (isConstellationOutlineUri(uri)) return true;
  const hasAnyStrokeColor =
    /stroke\s*:\s*#[0-9a-f]{3,8}/i.test(xml) ||
    /stroke\s*=\s*["']#[0-9a-f]{3,8}["']/i.test(xml);
  const hasClassedShapes = /class\s*=\s*["'](?:cls|st)[-_]?\d+/i.test(xml);
  const hasConstellationGeometry =
    /<(path|polyline|polygon|line)[\s>]/i.test(xml) && /fill\s*:\s*none/i.test(xml);
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
    (
      match,
      tagName: string,
      beforeClass: string,
      _quote: string,
      classValue: string,
      afterClass: string
    ) => {
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

      const existingStyleMatch = attrsWithoutClosingSlash.match(/\sstyle=(["'])([^"']*)\1/i);
      const existingStyle = existingStyleMatch?.[2]?.trim();
      const mergedStyle = [existingStyle, ...inlineParts].filter(Boolean).join("; ");

      const attrsWithoutStyle = attrsWithoutClosingSlash.replace(/\sstyle=(["'])([^"']*)\1/gi, "");
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

const resolveTargetHeight = (style: ImageStyle): number => {
  if (typeof style.height === "number") return style.height;
  if (typeof style.maxHeight === "number") return style.maxHeight;
  return DEFAULT_TARGET_HEIGHT;
};

const computeImageRect = ({
  targetHeight,
  ratio,
  slotWidth,
  maxWidthPercent,
}: {
  targetHeight: number;
  ratio: number;
  slotWidth: number | null;
  maxWidthPercent: number;
}): ImageRect => {
  const safeTargetHeight = Number.isFinite(targetHeight) && targetHeight > 0
    ? targetHeight
    : DEFAULT_TARGET_HEIGHT;
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;

  const idealWidth = safeTargetHeight * safeRatio;
  const maxAllowedWidth =
    typeof slotWidth === "number" && slotWidth > 0
      ? slotWidth * maxWidthPercent
      : idealWidth;
  const width = Math.max(1, Math.min(idealWidth, maxAllowedWidth));
  const height = Math.max(1, width / safeRatio);

  return { width, height };
};

export function PromptImage({
  uri,
  imageStyle,
  onHeightChange,
  renderMode = "default",
}: PromptImageProps) {
  const { colors, flashcardsImageFrameEnabled } = useSettings();
  const overlayColor = renderMode === "correction" ? "#FDE047" : "#FF5470";

  const [isSvg, setIsSvg] = useState(() => isSvgUri(uri));
  const [svgXml, setSvgXml] = useState<string | null>(null);
  const [contentRatio, setContentRatio] = useState<number>(1);
  const [hasResolvedDimensions, setHasResolvedDimensions] = useState(false);
  const [slotWidth, setSlotWidth] = useState<number | null>(null);
  const [isConstellationOutline, setIsConstellationOutline] = useState(false);
  const [isConstellationMerged, setIsConstellationMerged] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const applySvgXml = (xml: string) => {
      const constellationMode = isLikelyConstellationOutlineSvg(xml, uri);
      const mergedMode = isMergedConstellationSvg(xml, uri);
      const normalized = inlineSvgClassStyles(xml);
      const enhancedOutline = constellationMode
        ? boostConstellationOutlineContrast(normalized)
        : normalized;
      const enhanced = mergedMode
        ? enhanceMergedConstellationSvg(enhancedOutline, colors.headline, overlayColor)
        : enhancedOutline;
      const parsedViewBox = parseSvgViewBox(enhanced);

      setIsSvg(true);
      setSvgXml(enhanced);
      setContentRatio(parsedViewBox ? parsedViewBox.width / parsedViewBox.height : 1);
      setIsConstellationOutline(constellationMode);
      setIsConstellationMerged(mergedMode);
      setHasResolvedDimensions(true);
    };

    const preloaded = getPreloadedImage(uri);
    if (preloaded) {
      if (preloaded.kind === "svg") {
        applySvgXml(preloaded.xml);
      } else {
        setIsSvg(false);
        setSvgXml(null);
        setContentRatio(preloaded.ratio);
        setIsConstellationOutline(false);
        setIsConstellationMerged(false);
        setHasResolvedDimensions(true);
      }
      return () => {
        cancelled = true;
      };
    }

    const load = async () => {
      try {
        const uriLooksSvg = isSvgUri(uri);
        if (!cancelled) {
          setIsSvg(uriLooksSvg);
          setSvgXml(null);
          setHasResolvedDimensions(false);
          setIsConstellationOutline(false);
          setIsConstellationMerged(false);
        }

        if (uri.startsWith("data:image/svg+xml")) {
          const raw = uri.split(",")[1] ?? "";
          const decoded = decodeURIComponent(raw);
          const constellationMode = isLikelyConstellationOutlineSvg(decoded, uri);
          const mergedMode = isMergedConstellationSvg(decoded, uri);
          const normalized = inlineSvgClassStyles(decoded);
          const enhancedOutline = constellationMode
            ? boostConstellationOutlineContrast(normalized)
            : normalized;
          const enhanced = mergedMode
            ? enhanceMergedConstellationSvg(enhancedOutline, colors.headline, overlayColor)
            : enhancedOutline;
          const parsedViewBox = parseSvgViewBox(enhanced);

          if (!cancelled) {
            setIsSvg(true);
            if (parsedViewBox) {
              setContentRatio(parsedViewBox.width / parsedViewBox.height);
            } else {
              setContentRatio(1);
            }
            setIsConstellationOutline(constellationMode);
            setIsConstellationMerged(mergedMode);
            setSvgXml(constellationMode || mergedMode ? enhanced : null);
            setHasResolvedDimensions(true);
          }
          return;
        }

        if (uriLooksSvg && (uri.startsWith("http://") || uri.startsWith("https://"))) {
          if (!cancelled) {
            const outlineMode = isConstellationOutlineUri(uri);
            const mergedMode = /\/generated\/.+-merged\.svg(\?|#|$)/i.test(uri);
            setIsSvg(true);
            setSvgXml(null);
            setContentRatio(1);
            setIsConstellationOutline(outlineMode);
            setIsConstellationMerged(mergedMode);
            setHasResolvedDimensions(true);
          }
          return;
        }

        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists) {
          if (!cancelled) {
            setIsSvg(false);
            setSvgXml(null);
            setContentRatio(1);
            setIsConstellationOutline(false);
            setIsConstellationMerged(false);
            setHasResolvedDimensions(true);
          }
          return;
        }

        if (uriLooksSvg) {
          const xml = await FileSystem.readAsStringAsync(uri);
          const constellationMode = isLikelyConstellationOutlineSvg(xml, uri);
          const mergedMode = isMergedConstellationSvg(xml, uri);
          const shouldInlineXml = constellationMode || mergedMode;
          const normalizedXml = shouldInlineXml ? inlineSvgClassStyles(xml) : xml;
          const enhancedOutline = constellationMode
            ? boostConstellationOutlineContrast(normalizedXml)
            : normalizedXml;
          const enhancedXml = mergedMode
            ? enhanceMergedConstellationSvg(
                enhancedOutline,
                colors.headline,
                overlayColor
              )
            : enhancedOutline;

          const hasSvgTag = /<svg[\s>]/i.test(enhancedXml);
          const looksLikeSvg = uriLooksSvg || hasSvgTag;

          if (!cancelled) {
            if (looksLikeSvg) {
              const parsedViewBox = parseSvgViewBox(enhancedXml);
              setIsSvg(true);
              setSvgXml(shouldInlineXml ? enhancedXml : null);
              setIsConstellationOutline(constellationMode);
              setIsConstellationMerged(mergedMode);
              if (parsedViewBox) {
                setContentRatio(parsedViewBox.width / parsedViewBox.height);
              } else {
                setContentRatio(1);
              }
              setHasResolvedDimensions(true);
            } else {
              setIsSvg(false);
              setSvgXml(null);
              setIsConstellationOutline(false);
              setIsConstellationMerged(false);
              RNImage.getSize(
                uri,
                (width, height) => {
                  if (cancelled) return;
                  if (width > 0 && height > 0) {
                    setContentRatio(width / height);
                    setHasResolvedDimensions(true);
                    return;
                  }
                  setContentRatio(1);
                  setHasResolvedDimensions(true);
                },
                () => {
                  if (!cancelled) {
                    setContentRatio(1);
                    setHasResolvedDimensions(true);
                  }
                }
              );
            }
          }
          return;
        }

        RNImage.getSize(
          uri,
          (width, height) => {
            if (cancelled) return;
            setIsSvg(false);
            setSvgXml(null);
            setIsConstellationOutline(false);
            setIsConstellationMerged(false);
            if (width > 0 && height > 0) {
              setContentRatio(width / height);
              setHasResolvedDimensions(true);
              return;
            }
            setContentRatio(1);
            setHasResolvedDimensions(true);
          },
          () => {
            if (cancelled) return;
            setIsSvg(false);
            setSvgXml(null);
            setIsConstellationOutline(false);
            setIsConstellationMerged(false);
            setContentRatio(1);
            setHasResolvedDimensions(true);
          }
        );
      } catch {
        if (!cancelled) {
          setIsSvg(false);
          setSvgXml(null);
          setContentRatio(1);
          setHasResolvedDimensions(true);
          setIsConstellationOutline(false);
          setIsConstellationMerged(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [colors.headline, overlayColor, uri]);

  const slotStyle = useMemo(() => {
    const flat = (StyleSheet.flatten(imageStyle) || {}) as ViewStyle;
    return {
      ...flat,
      alignItems: "center",
      justifyContent: "center",
    } as ViewStyle;
  }, [imageStyle]);

  const frameStyle = useMemo(() => {
    const flat = (StyleSheet.flatten(imageStyle) || {}) as ImageStyle;
    const baseTargetHeight = resolveTargetHeight(flat);
    const boostMultiplier = isConstellationMerged ? 2.1 : 1.7;
    const boostedTargetHeight =
      isConstellationOutline || isConstellationMerged
        ? Math.min(Math.max(baseTargetHeight * boostMultiplier, 200), 280)
        : baseTargetHeight;
    const rect = computeImageRect({
      targetHeight: boostedTargetHeight,
      ratio: contentRatio,
      slotWidth,
      maxWidthPercent: SLOT_MAX_WIDTH_FRACTION,
    });

    return {
      width: rect.width,
      height: rect.height,
      opacity: hasResolvedDimensions ? 1 : 0,
      borderWidth: flashcardsImageFrameEnabled && isSvg ? 1 : 0,
      borderColor: colors.border ?? "#00000033",
      backgroundColor: "transparent",
      borderRadius: (flat.borderRadius as number | undefined) ?? 6,
      overflow: "hidden",
      flexGrow: 0,
      flexShrink: 0,
      alignSelf: "center",
    } as ViewStyle;
  }, [
    colors.border,
    contentRatio,
    flashcardsImageFrameEnabled,
    imageStyle,
    isConstellationMerged,
    isConstellationOutline,
    isSvg,
    hasResolvedDimensions,
    slotWidth,
  ]);

  return (
    <View
      style={slotStyle}
      onLayout={({ nativeEvent }) => {
        setSlotWidth(nativeEvent.layout.width);
      }}
    >
      <View
        style={frameStyle}
        onLayout={({ nativeEvent }) => onHeightChange?.(nativeEvent.layout.height)}
      >
        {isSvg ? (
          svgXml ? (
            <SvgXml
              xml={svgXml}
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid meet"
            />
          ) : (
            <SvgUri
              uri={uri}
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid meet"
            />
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
