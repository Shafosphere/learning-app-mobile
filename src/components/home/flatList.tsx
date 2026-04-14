import React from "react";
import {
  Image,
  Pressable,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
import type { HomeScreenStyles } from "@/src/screens/home/HomeScreen-styles";

export type HomeTile = {
  key: string;
  title: string;
  subtitle: string;
  image?: any;
  icon?: React.ReactNode;
  action?: () => void;
  isPlaceholder?: boolean;
};

export const renderHomeTile =
  (styles: HomeScreenStyles): ListRenderItem<HomeTile> => {
    const HomeTileItem: ListRenderItem<HomeTile> & { displayName?: string } = ({
      item,
    }) => {
      if (item.isPlaceholder) {
        return <View style={[styles.tile, styles.placeholderTile]} />;
      }

      return (
        <Pressable
          onPress={item.action}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
        >
          <View style={styles.tileVisualArea}>
            <View style={styles.iconBox}>
              {item.icon ? (
                item.icon
              ) : item.image ? (
                <Image source={item.image} style={styles.iconImage} />
              ) : null}
            </View>
          </View>
          <View style={styles.tileText}>
            <Text
              style={styles.tileTitle}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {item.title}
            </Text>
            <Text
              style={[
                styles.tileSubtitle,
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
