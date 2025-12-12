import type { ComponentType, ReactNode } from "react";
import type {
  GestureResponderEvent,
  ImageSourcePropType,
  ImageStyle,
  PressableProps,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import { Image, Pressable, Text, View } from "react-native";

import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import { CourseTitleMarquee } from "./CourseTitleMarquee";

type IconConfig = {
  Component: ComponentType<any>;
  name: string | number;
  color: string;
  size?: number;
};

type CourseCardProps = {
  title: string;
  meta?: string;
  icon: IconConfig;
  flagSource?: ImageSourcePropType;
  mainImageSource?: ImageSourcePropType;
  onPress?: (event: GestureResponderEvent) => void;
  containerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  iconWrapperStyle?: StyleProp<ViewStyle>;
  flagStyle?: StyleProp<ImageStyle>;
  infoStyle?: StyleProp<ViewStyle>;
  titleContainerStyle?: StyleProp<ViewStyle>;
  titleTextStyle?: StyleProp<TextStyle>;
  metaTextStyle?: StyleProp<TextStyle>;
  rightAccessory?: ReactNode;
  isHighlighted?: boolean;
  highlightedStyle?: StyleProp<ViewStyle>;
  pressableProps?: Omit<PressableProps, "onPress" | "style">;
};

const useStyles = createThemeStylesHook((colors) => ({
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
        // backgroundColor: colors.my_green,

  },
  iconWrapper: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    // backgroundColor: colors.my_green,
  },
  iconFlag: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 99 / 3,
    height: 66 / 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
    alignItems: "flex-start",
    // backgroundColor: colors.my_green,
  },
  titleContainer: {
    width: "100%",
    overflow: "hidden",
  },
  titleText: {
    fontSize: 25,
    fontWeight: "900",
    color: colors.headline,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.paragraph,
    marginTop: 4,
    textAlign: "left",
  },
  highlighted: {
    backgroundColor: colors.my_green,
  },
}));

export function CourseCard({
  title,
  meta,
  icon,
  flagSource,
  mainImageSource,
  onPress,
  containerStyle,
  contentStyle,
  iconWrapperStyle,
  flagStyle,
  infoStyle,
  titleContainerStyle,
  titleTextStyle,
  metaTextStyle,
  rightAccessory,
  isHighlighted,
  highlightedStyle,
  ...pressableProps
}: CourseCardProps & PressableProps) {
  const styles = useStyles();
  const IconComponent = icon.Component;
  const iconSize = icon.size ?? 60;

  return (
    <Pressable
      {...pressableProps}
      onPress={onPress}
      style={[
        containerStyle,
        isHighlighted ? highlightedStyle ?? styles.highlighted : null,
      ]}
    >
      <View style={[styles.content, contentStyle]}>
        <View style={[styles.iconWrapper, iconWrapperStyle]}>
          {mainImageSource ? (
            <Image
              source={mainImageSource}
              style={{ width: iconSize, height: iconSize, resizeMode: "contain" }}
            />
          ) : (
            <IconComponent name={icon.name} size={iconSize} color={icon.color} />
          )}
          {flagSource ? (
            <Image source={flagSource} style={[styles.iconFlag, flagStyle]} />
          ) : null}
        </View>
        <View style={[styles.info, infoStyle]}>
          <CourseTitleMarquee
            text={title}
            containerStyle={[styles.titleContainer, titleContainerStyle]}
            textStyle={[styles.titleText, titleTextStyle]}
          />
          {meta ? (
            <Text style={[styles.metaText, metaTextStyle]}>{meta}</Text>
          ) : null}
        </View>
      </View>
      {rightAccessory}
    </Pressable>
  );
}
