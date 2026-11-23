import { Image } from "expo-image";
import { SvgUri, SvgXml } from "react-native-svg";

import type { CardPreviewImage } from "../imagePreviewContext";

export function PromptImageContent({
  image,
  onError,
  onReady,
}: {
  image: Pick<CardPreviewImage, "uri" | "isSvg" | "svgXml">;
  onError?: () => void;
  onReady?: (size?: { width: number; height: number }) => void;
}) {
  if (image.isSvg) {
    const size = { width: "100%", height: "100%", preserveAspectRatio: "xMidYMid meet" } as const;
    return image.svgXml ? (
      <SvgXml {...size} xml={image.svgXml} onError={onError} />
    ) : image.uri.startsWith("data:image/svg+xml") ? null : (
      <SvgUri {...size} uri={image.uri} onError={onError} onLoad={onReady} />
    );
  }

  return (
    <Image
      source={{ uri: image.uri }}
      recyclingKey={image.uri}
      style={{ width: "100%", height: "100%" }}
      contentFit="contain"
      transition={0}
      onLoad={(event) => onReady?.({ width: event.source.width, height: event.source.height })}
      onError={(event) => {
        console.warn("[PromptImage] failed to render image", {
          uri: image.uri,
          error: event.error,
        });
        onError?.();
      }}
    />
  );
}
