import type { ComponentProps, ReactNode } from "react";
import type { LayoutChangeEvent } from "react-native";
import Reanimated from "react-native-reanimated";
import type { useStyles } from "@/src/screens/flashcards/FlashcardsScreen/FlashcardsScreen-styles";

type FlashcardsStudyContentProps = {
  cardBottomGap?: number;
  styles: ReturnType<typeof useStyles>;
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
