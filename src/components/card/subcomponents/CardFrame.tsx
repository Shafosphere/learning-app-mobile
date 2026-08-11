import { ReactNode, useCallback } from "react";
import Animated, { LinearTransition } from "react-native-reanimated";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";

import { useStyles } from "../card-styles";

type CardFrameProps = {
  coachmarkId?: string;
  compact?: boolean;
  animateLayout?: boolean;
  cardStateStyle?: object;
  cardWidth?: number;
  minHeight?: number;
  contentScale?: number;
  backgroundColorOverride?: string;
  /** Development-only label used to trace unexpected card size changes. */
  layoutDebugLabel?: string;
  underlay?: ReactNode;
  children: ReactNode;
};

const CARD_LAYOUT_TRANSITION = LinearTransition.duration(420);

export default function CardFrame({
  coachmarkId,
  compact = false,
  animateLayout = true,
  cardStateStyle,
  cardWidth,
  minHeight,
  contentScale = 1,
  backgroundColorOverride,
  layoutDebugLabel,
  underlay,
  children,
}: CardFrameProps) {
  const styles = useStyles();
  const logFrameLayout = useCallback(
    ({ nativeEvent: { layout } }: any) => {
      if (!__DEV__) return;

      console.log("[card-layout] frame", {
        scene: layoutDebugLabel,
        compact,
        width: layout.width,
        height: layout.height,
        configuredWidth: cardWidth,
        configuredMinHeight: minHeight,
        contentScale,
      });
    },
    [cardWidth, compact, contentScale, layoutDebugLabel, minHeight],
  );

  const content = (
    <Animated.View
      layout={animateLayout ? CARD_LAYOUT_TRANSITION : undefined}
      style={[
        styles.card,
        styles.cardFrame,
        compact ? styles.cardSmall : styles.cardLarge,
        cardWidth != null ? { width: cardWidth } : null,
        minHeight != null ? { minHeight } : null,
        cardStateStyle,
        backgroundColorOverride ? { backgroundColor: backgroundColorOverride } : null,
      ]}
      onLayout={logFrameLayout}
    >
      {compact ? (
        <Animated.View
          layout={animateLayout ? CARD_LAYOUT_TRANSITION : undefined}
          style={[
            styles.cardSmallContent,
            {
              paddingVertical: 10 * contentScale,
              gap: 10 * contentScale,
            },
          ]}
        >
          {children}
        </Animated.View>
      ) : (
        children
      )}
    </Animated.View>
  );

  const framedContent = underlay ? (
    <Animated.View
      layout={animateLayout ? CARD_LAYOUT_TRANSITION : undefined}
      style={[styles.cardEditStack, { width: cardWidth }]}
    >
      {underlay}
      {content}
    </Animated.View>
  ) : content;

  if (!coachmarkId) return framedContent;

  return (
    <CoachmarkAnchor id={coachmarkId} shape="rect" radius={20}>
      {framedContent}
    </CoachmarkAnchor>
  );
}
