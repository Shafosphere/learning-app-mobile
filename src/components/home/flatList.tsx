import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  Image,
  Text,
  View,
  type ListRenderItem,
  type ImageSourcePropType,
  type ImageStyle,
} from "react-native";
import BoxSkin from "@/src/components/Box/Skin/BoxSkin";
import type { BoxFaceParts, Face } from "@/src/components/Box/Skin/boxFaces";
import type { HomeScreenStyles } from "@/src/screens/home/HomeScreen/HomeScreen-styles";

export type HomeTile = {
  key: string;
  title: string;
  subtitle: string;
  face?: Face;
  faceParts?: Partial<BoxFaceParts>;
  pressedFace?: Face;
  pressedFaceParts?: Partial<BoxFaceParts>;
  contentSource?: ImageSourcePropType;
  contentStyle?: ImageStyle;
  contentCopyStyles?: ImageStyle[];
  foregroundSource?: ImageSourcePropType;
  foregroundStyle?: ImageStyle;
  foregroundLabel?: string;
  decorations?: { source: ImageSourcePropType; style?: ImageStyle }[];
  action?: () => void;
  isPlaceholder?: boolean;
};

type RenderHomeTileOptions = {
  tileSize: number;
  isTabletLayout?: boolean;
};

type HomeTileItemProps = {
  item: HomeTile;
  styles: HomeScreenStyles;
  options: RenderHomeTileOptions;
};

const MIN_FACE_REACTION_MS = 400;

export const HomeTileItem = React.memo(function HomeTileItem({ item, styles, options }: HomeTileItemProps) {
  const [pressed, setPressed] = useState(false);
  const reactionStartedAt = useRef<number | null>(null);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (reactionTimer.current != null) clearTimeout(reactionTimer.current);
  }, []);

  const startReaction = () => {
    if (reactionTimer.current != null) clearTimeout(reactionTimer.current);
    reactionStartedAt.current = Date.now();
    setPressed(true);
  };
  const finishReaction = () => {
    if (reactionStartedAt.current == null) return;
    if (reactionTimer.current != null) clearTimeout(reactionTimer.current);
    const remaining = Math.max(0, MIN_FACE_REACTION_MS - (Date.now() - reactionStartedAt.current));
    reactionTimer.current = setTimeout(() => {
      reactionTimer.current = null;
      reactionStartedAt.current = null;
      setPressed(false);
    }, remaining);
  };
  const { isTabletLayout = false, tileSize } = options;
  const isCompactTile = tileSize < 160;
  const tileSizeStyle = { width: tileSize, height: tileSize };
  const iconSize = Math.min(isTabletLayout ? 132 : 90, tileSize * 0.54);
  const iconSizeStyle = { width: iconSize, height: iconSize };
  const mascotScale = iconSize / 122;
  const face = pressed ? item.pressedFace ?? item.face : item.face;
  const faceParts = pressed
    ? item.pressedFaceParts ?? (item.pressedFace ? undefined : item.faceParts)
    : item.faceParts;

  if (item.isPlaceholder) {
    return (
      <View
        testID="home-tile-placeholder"
        style={[styles.tile, tileSizeStyle, styles.placeholderTile]}
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    );
  }

  const accessibilityLabel = [item.title, item.subtitle]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      onPressIn={startReaction}
      onPressOut={finishReaction}
      onPress={() => {
        // Also show feedback for accessibility activation without touch events.
        if (reactionStartedAt.current == null) startReaction();
        finishReaction();
        item.action?.();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.tile,
        tileSizeStyle,
        pressed && styles.tilePressed,
      ]}
    >
      {item.decorations && (
        <View
          style={styles.tileDecorations}
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {item.decorations.map((decoration, index) => (
            <Image
              key={index}
              source={decoration.source}
              style={[
                styles.tileCornerDecoration,
                { width: tileSize, height: tileSize * (824 / 1909) },
                decoration.style,
              ]}
              resizeMode="contain"
              accessible={false}
            />
          ))}
        </View>
      )}
      <View
        style={[
          styles.tileVisualArea,
          isTabletLayout && styles.tileVisualAreaTablet,
          isCompactTile && styles.tileVisualAreaCompact,
        ]}
      >
        <View
          testID={`home-tile-mascot-${item.key}`}
          style={[
            styles.iconBox,
            isTabletLayout && styles.iconBoxTablet,
            iconSizeStyle,
          ]}
        >
          {face ? (
            <View
              style={[styles.mascotFrame, { transform: [{ scale: mascotScale }] }]}
            >
              <BoxSkin
                wordCount={0}
                face={face}
                faceParts={faceParts}
                cardVariant="logo"
                contentSource={item.contentSource}
                contentStyle={item.contentStyle}
                contentCopyStyles={item.contentCopyStyles}
                foregroundSource={item.foregroundSource}
                foregroundStyle={item.foregroundStyle}
                foregroundLabel={item.foregroundLabel}
                showFace
                accessible={false}
              />
            </View>
          ) : null}
        </View>
      </View>
      <View
        style={[
          styles.tileText,
          isTabletLayout && styles.tileTextTablet,
          isCompactTile && styles.tileTextCompact,
        ]}
      >
        <Text
          style={[
            styles.tileTitle,
            isTabletLayout && styles.tileTitleTablet,
            isCompactTile && styles.tileTitleCompact,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {item.title}
        </Text>
        <Text
          style={[
            styles.tileSubtitle,
            isTabletLayout && styles.tileSubtitleTablet,
            isCompactTile && styles.tileSubtitleCompact,
            !item.subtitle && styles.tileSubtitleHidden,
          ]}
          numberOfLines={2}
        >
          {item.subtitle || "placeholder"}
        </Text>
      </View>
    </Pressable>
  );
});

export const renderHomeTile = (
  styles: HomeScreenStyles,
  options: RenderHomeTileOptions,
): ListRenderItem<HomeTile> => {
  return function renderItem({ item }) {
    return <HomeTileItem item={item} styles={styles} options={options} />;
  };
};
