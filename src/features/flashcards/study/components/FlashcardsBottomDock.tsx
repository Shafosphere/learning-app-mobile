import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";
import type { Dispatch, ReactNode, Ref, SetStateAction } from "react";
import { useMemo } from "react";
import { Animated, View } from "react-native";
import type { LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";

type FlashcardsBottomDockProps = {
  bottomOffset: number;
  keyboardOffset: Animated.Value;
  anchorRef: Ref<View>;
  setHeight: Dispatch<SetStateAction<number>>;
  measure: () => void;
  styles: {
    bottomButtonsDock: StyleProp<ViewStyle>;
    bottomButtonsWrapper: StyleProp<ViewStyle>;
  };
  onLayout?: (event: LayoutChangeEvent) => void;
  testID?: string;
  coachmarkId?: string;
  children: ReactNode;
};

export function FlashcardsBottomDock({
  bottomOffset, keyboardOffset, anchorRef, setHeight, measure,
  styles, onLayout, testID, coachmarkId, children,
}: FlashcardsBottomDockProps) {
  const translateY = useMemo(() => Animated.multiply(keyboardOffset, -1), [keyboardOffset]);
  const content = (
    <Animated.View
      style={{
        width: "100%",
        transform: [{ translateY }],
      }}
    >
      {children}
    </Animated.View>
  );

  return (
    <View
      style={[styles.bottomButtonsDock, { bottom: bottomOffset }]}
      pointerEvents="box-none"
    >
      <View
        testID={testID}
        ref={anchorRef}
        onLayout={(event) => {
          onLayout?.(event);
          const nextHeight = event.nativeEvent.layout.height;
          setHeight((prev) => Math.abs(prev - nextHeight) < 1 ? prev : nextHeight);
          measure();
        }}
        collapsable={false}
        style={styles.bottomButtonsWrapper}
      >
        {coachmarkId ? (
          <CoachmarkAnchor id={coachmarkId} shape="rect" radius={24}>
            <View collapsable={false}>{content}</View>
          </CoachmarkAnchor>
        ) : content}
      </View>
    </View>
  );
}
