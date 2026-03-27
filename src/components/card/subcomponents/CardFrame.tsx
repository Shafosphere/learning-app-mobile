import { ReactNode } from "react";
import Animated, { LinearTransition } from "react-native-reanimated";

import { useStyles } from "../card-styles";

type CardFrameProps = {
  compact?: boolean;
  animateLayout?: boolean;
  cardStateStyle?: object;
  backgroundColorOverride?: string;
  children: ReactNode;
};

const CARD_LAYOUT_TRANSITION = LinearTransition.duration(420);

export default function CardFrame({
  compact = false,
  animateLayout = true,
  cardStateStyle,
  backgroundColorOverride,
  children,
}: CardFrameProps) {
  const styles = useStyles();

  return (
    <Animated.View
      layout={animateLayout ? CARD_LAYOUT_TRANSITION : undefined}
      style={[
        styles.card,
        styles.cardFrame,
        compact ? styles.cardSmall : styles.cardLarge,
        cardStateStyle,
        backgroundColorOverride ? { backgroundColor: backgroundColorOverride } : null,
      ]}
    >
      {compact ? (
        <Animated.View
          layout={animateLayout ? CARD_LAYOUT_TRANSITION : undefined}
          style={styles.cardSmallContent}
        >
          {children}
        </Animated.View>
      ) : (
        children
      )}
    </Animated.View>
  );
}
