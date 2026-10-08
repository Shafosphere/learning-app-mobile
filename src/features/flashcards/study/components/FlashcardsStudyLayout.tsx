import { KeyboardStudyScroll } from "@/src/components/flashcards/KeyboardStudyScroll";
import type { ComponentProps, ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import type { useFlashcardsStudyCoordinator } from "../hooks/useFlashcardsStudyCoordinator";
import { FlashcardsBottomDock } from "./FlashcardsBottomDock";
import { FlashcardsBoxesSection } from "./FlashcardsBoxesSection";
import { FlashcardsStudyContent, type FlashcardsStudyContentStyles } from "./FlashcardsStudyContent";

type BoxesProps = Omit<ComponentProps<typeof FlashcardsBoxesSection>,
  keyof ReturnType<typeof useFlashcardsStudyCoordinator>["boxesLayoutProps"] | "styles" | "screenSectionLayout">;
type Props = {
  testIDPrefix?: string;
  bottomButtonsCoachmarkId?: string;
  layout: ReturnType<typeof useFlashcardsStudyCoordinator>;
  styles: FlashcardsStudyContentStyles
    & ComponentProps<typeof FlashcardsBoxesSection>["styles"]
    & ComponentProps<typeof FlashcardsBottomDock>["styles"]
    & { content: StyleProp<ViewStyle>; studyStack: StyleProp<ViewStyle>; tabletCenteredStudyStack: StyleProp<ViewStyle> };
  cardSection: ReactNode;
  topButtons: ReactNode;
  bottomButtons: ReactNode;
  boxes: BoxesProps | null;
  isCourseFinishedVisible: boolean;
  interactionBlocked: boolean;
};

export function FlashcardsStudyLayout({
  testIDPrefix = "flashcards", bottomButtonsCoachmarkId,
  layout, styles, cardSection, topButtons, bottomButtons, boxes,
  isCourseFinishedVisible, interactionBlocked,
}: Props) {
  const { studyLayout, dock, screenSectionLayout } = layout;
  return (
    <View
      testID={`${testIDPrefix}-content`}
      onLayout={studyLayout.onStudyLayout}
      style={[
        styles.content,
        dock.shouldReserveBottomButtonsSpace ? { paddingBottom: dock.bottomButtonsReservedSpace } : null,
      ]}
      pointerEvents={interactionBlocked ? "none" : "auto"}
    >
      <KeyboardStudyScroll
        testID={layout.isTabletCenteredStudyLayout ? `${testIDPrefix}-study-stack` : `${testIDPrefix}-study-scroll`}
        enabled={layout.studyScrollEnabled}
        keyboardVisible={studyLayout.keyboardVisible}
        keyboardTopInWindow={studyLayout.keyboardTopInWindow}
        cardHeight={studyLayout.visibleCardHeight}
        contentContainerStyle={layout.isTabletCenteredStudyLayout
          ? [styles.studyStack, styles.tabletCenteredStudyStack] : undefined}
      >
        <FlashcardsStudyContent
          cardBottomGap={studyLayout.cardBottomGap}
          styles={styles}
          screenSectionLayout={screenSectionLayout}
          cardSection={cardSection}
          topButtons={topButtons}
          boxesSection={boxes ? (
            <FlashcardsBoxesSection
              {...boxes}
              {...layout.boxesLayoutProps}
              styles={styles}
              screenSectionLayout={screenSectionLayout}
            />
          ) : null}
          isCourseFinishedVisible={isCourseFinishedVisible}
          showTopButtons={layout.showTopButtons}
          onCardSectionLayout={!isCourseFinishedVisible ? studyLayout.onCardSectionLayout : undefined}
          onTopButtonsLayout={studyLayout.onTopButtonsLayout}
        />
      </KeyboardStudyScroll>
      {dock.shouldRenderBottomButtons ? (
        <FlashcardsBottomDock
          styles={styles}
          bottomOffset={dock.bottomButtonsDockBottomOffset}
          keyboardOffset={dock.bottomButtonsOffset}
          anchorRef={dock.bottomButtonsAnchorRef}
          setHeight={dock.setBottomButtonsHeight}
          measure={dock.measureBottomButtons}
          testID={`${testIDPrefix}-bottom-buttons`}
          coachmarkId={bottomButtonsCoachmarkId}
          onLayout={studyLayout.onBottomButtonsLayout}
        >
          {bottomButtons}
        </FlashcardsBottomDock>
      ) : null}
    </View>
  );
}
