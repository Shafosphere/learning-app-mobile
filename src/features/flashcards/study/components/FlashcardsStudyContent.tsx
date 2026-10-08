import type { ComponentProps, ReactNode } from "react";
import type { LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";
import Reanimated from "react-native-reanimated";
export type FlashcardsStudyContentStyles = {
  cardSectionWrapper: StyleProp<ViewStyle>;
  finishedCardSectionWrapper: StyleProp<ViewStyle>;
  topButtonsWrapper: StyleProp<ViewStyle>;
};

type FlashcardsStudyContentProps = {
  cardBottomGap?: number;
  styles: FlashcardsStudyContentStyles;
  screenSectionLayout: ComponentProps<typeof Reanimated.View>["layout"];
  cardSection: ReactNode;
  topButtons: ReactNode | null;
  boxesSection: ReactNode | null;
  isCourseFinishedVisible: boolean;
  showTopButtons: boolean;
  onCardSectionLayout?: (event: LayoutChangeEvent) => void;
  onTopButtonsLayout?: (event: LayoutChangeEvent) => void;
};

export function FlashcardsStudyContent({
  styles,
  cardBottomGap,
  screenSectionLayout,
  cardSection,
  topButtons,
  boxesSection,
  isCourseFinishedVisible,
  showTopButtons,
  onCardSectionLayout,
  onTopButtonsLayout,
}: FlashcardsStudyContentProps) {
  return (
    <>
      <Reanimated.View
        testID="flashcards-card-section"
        onLayout={onCardSectionLayout}
        layout={screenSectionLayout}
        style={[
          styles.cardSectionWrapper,
          cardBottomGap != null ? { marginBottom: cardBottomGap } : null,
          isCourseFinishedVisible && styles.finishedCardSectionWrapper,
        ]}
      >
        {cardSection}
      </Reanimated.View>

      {showTopButtons ? (
        <Reanimated.View
          testID="flashcards-top-buttons"
          onLayout={onTopButtonsLayout}
          layout={screenSectionLayout}
          style={styles.topButtonsWrapper}
        >
          {topButtons}
        </Reanimated.View>
      ) : null}

      {boxesSection}
    </>
  );
}
