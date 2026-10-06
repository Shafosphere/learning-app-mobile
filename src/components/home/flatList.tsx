import React from "react";
import {
  Image,
  Pressable,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
import type { HomeScreenStyles } from "@/src/screens/home/HomeScreen/HomeScreen-styles";

export type HomeTile = {
  key: string;
  title: string;
  subtitle: string;
  image?: any;
  icon?: React.ReactNode;
  action?: () => void;
  isPlaceholder?: boolean;
};

type RenderHomeTileOptions = {
  tileSize: number;
  isTabletLayout?: boolean;
};

export const renderHomeTile =
  (
    styles: HomeScreenStyles,
    options: RenderHomeTileOptions,
  ): ListRenderItem<HomeTile> => {
    const { isTabletLayout = false, tileSize } = options;
    const tileSizeStyle = { width: tileSize, height: tileSize };
    const iconSize = Math.min(isTabletLayout ? 132 : 90, tileSize * 0.54);
    const iconSizeStyle = { width: iconSize, height: iconSize };

    const HomeTileItem: ListRenderItem<HomeTile> & { displayName?: string } = ({
      item,
    }) => {
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
          onPress={item.action}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={({ pressed }) => [
            styles.tile,
            tileSizeStyle,
            pressed && styles.tilePressed,
          ]}
        >
          <View
            style={[
              styles.tileVisualArea,
              isTabletLayout && styles.tileVisualAreaTablet,
            ]}
          >
            <View
              style={[
                styles.iconBox,
                isTabletLayout && styles.iconBoxTablet,
                iconSizeStyle,
              ]}
            >
              {item.icon ? (
                item.icon
              ) : item.image ? (
                <Image source={item.image} style={styles.iconImage} />
              ) : null}
            </View>
          </View>
          <View
            style={[styles.tileText, isTabletLayout && styles.tileTextTablet]}
          >
            <Text
              style={[styles.tileTitle, isTabletLayout && styles.tileTitleTablet]}
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
                !item.subtitle && styles.tileSubtitleHidden,
              ]}
              numberOfLines={2}
            >
              {item.subtitle || "placeholder"}
            </Text>
          </View>
        </Pressable>
      );
    };
    HomeTileItem.displayName = "HomeTileItem";
    return HomeTileItem;
  };
