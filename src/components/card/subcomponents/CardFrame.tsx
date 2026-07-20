import { ReactNode } from "react";
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
  children,
}: CardFrameProps) {
  const styles = useStyles();

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

  if (!coachmarkId) {
    return content;
  }

  return (
    <CoachmarkAnchor id={coachmarkId} shape="rect" radius={20}>
      {content}
    </CoachmarkAnchor>
  );
}
