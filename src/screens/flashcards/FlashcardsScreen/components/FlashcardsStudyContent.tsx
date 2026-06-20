import type { ComponentProps, ReactNode } from "react";
import Reanimated from "react-native-reanimated";
import type { useStyles } from "@/src/screens/flashcards/FlashcardsScreen/FlashcardsScreen-styles";

type FlashcardsStudyContentProps = {
  styles: ReturnType<typeof useStyles>;
  screenSectionLayout: ComponentProps<typeof Reanimated.View>["layout"];
  cardSection: ReactNode;
  topButtons: ReactNode | null;
  boxesSection: ReactNode | null;
  isCourseFinishedVisible: boolean;
  showTopButtons: boolean;
};

export function FlashcardsStudyContent({
  styles,
  screenSectionLayout,
  cardSection,
  topButtons,
  boxesSection,
  isCourseFinishedVisible,
  showTopButtons,
}: FlashcardsStudyContentProps) {
  return (
    <>
      <Reanimated.View
        layout={screenSectionLayout}
        style={[
          styles.cardSectionWrapper,
          isCourseFinishedVisible && styles.finishedCardSectionWrapper,
        ]}
      >
        {cardSection}
      </Reanimated.View>

      {showTopButtons ? (
        <Reanimated.View
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
