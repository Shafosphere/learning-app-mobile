import { Image } from "expo-image";
import { ImageStyle, StyleProp } from "react-native";

type PromptImageProps = {
  uri: string;
  imageStyle: StyleProp<ImageStyle>;
  onHeightChange?: (height: number) => void;
};

export function PromptImage({ uri, imageStyle, onHeightChange }: PromptImageProps) {
  return (
    <Image
      source={{ uri }}
      recyclingKey={uri}
      style={imageStyle}
      contentFit="contain"
      transition={0}
      onLayout={({ nativeEvent }) => {
        if (onHeightChange) {
          onHeightChange(nativeEvent.layout.height);
        }
      }}
    />
  );
}
