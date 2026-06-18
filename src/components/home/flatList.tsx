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
  isTabletLayout?: boolean;
  tabletIconSize?: number;
};

export const renderHomeTile =
  (
    styles: HomeScreenStyles,
    options: RenderHomeTileOptions = {},
  ): ListRenderItem<HomeTile> => {
    const { isTabletLayout = false, tabletIconSize } = options;
    const tabletTileStyle = isTabletLayout ? styles.tileTablet : null;
    const tabletIconStyle = isTabletLayout
      ? { width: tabletIconSize, height: tabletIconSize }
      : null;

    const HomeTileItem: ListRenderItem<HomeTile> & { displayName?: string } = ({
      item,
    }) => {
      if (item.isPlaceholder) {
        return (
          <View style={[styles.tile, tabletTileStyle, styles.placeholderTile]} />
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
            tabletTileStyle,
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
                tabletIconStyle,
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
