import Ionicons from "@expo/vector-icons/Ionicons";
import BoxesCarousel from "@/src/components/Box/Carousel/BoxCarousel";
import Boxes from "@/src/components/Box/List/BoxList";
import type { BoxFacesByBox } from "@/src/components/Box/Skin/boxFaces";
import type { BoxesState } from "@/src/types/boxes";
import { CoachmarkAnchor } from "@edwardloopez/react-native-coachmark";
import type { TFunction } from "i18next";
import type { ComponentProps } from "react";
import {
  Pressable,
  ScrollView,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Reanimated from "react-native-reanimated";
import type { useStyles } from "@/src/screens/flashcards/FlashcardsScreen/FlashcardsScreen-styles";

type FlashcardsBoxesSectionProps = {
  coachmarkId?: string;
  countsCoachmarkId?: string;
  testID?: string;
  styles: ReturnType<typeof useStyles>;
  screenSectionLayout: ComponentProps<typeof Reanimated.View>["layout"];
  boxes: BoxesState;
  activeBox: keyof BoxesState | null;
  boxZeroEnabled: boolean;
  tutorialBoxCountOverrides?: Partial<Record<keyof BoxesState, number>> | null;
  boxFaces: BoxFacesByBox;
  handleSelectBox: (boxName: keyof BoxesState) => void;
  handleBoxLongPress: (boxName: keyof BoxesState) => void;
  handleManualAddFlashcards: () => void;
  effectiveBoxesLayout: string;
  boxSelectionLocked: boolean;
  shouldShowFloatingAdd: boolean;
  addButtonDisabled: boolean;
  isSmallPhoneLayout: boolean;
  isTabletLayout: boolean;
  isTabletCompactBoxesLayout: boolean;
  maxColumns?: number;
  areButtonsOnTop: boolean;
  flashcardsContentWidth: number | undefined;
  boxesScale: number;
  boxesScaledHeight: number | undefined;
  boxesScaleOffsetY: number;
  boxesNeedScrollFallback: boolean;
  carouselBottomClearance?: number;
  onBoxesViewportLayout: (event: LayoutChangeEvent) => void;
  onBoxesContentLayout: (event: LayoutChangeEvent) => void;
  t: TFunction;
};

export function FlashcardsBoxesSection({
  coachmarkId,
  countsCoachmarkId,
  testID,
  styles,
  screenSectionLayout,
  boxes,
  activeBox,
  boxZeroEnabled,
  tutorialBoxCountOverrides,
  boxFaces,
  handleSelectBox,
  handleBoxLongPress,
  handleManualAddFlashcards,
  effectiveBoxesLayout,
  boxSelectionLocked,
  shouldShowFloatingAdd,
  addButtonDisabled,
  isSmallPhoneLayout,
  isTabletLayout,
  isTabletCompactBoxesLayout,
  maxColumns,
  areButtonsOnTop,
  flashcardsContentWidth,
  boxesScale,
  boxesScaledHeight,
  boxesScaleOffsetY,
  boxesNeedScrollFallback,
  carouselBottomClearance = 0,
  onBoxesViewportLayout,
  onBoxesContentLayout,
  t,
}: FlashcardsBoxesSectionProps) {
  const boxesContent =
    effectiveBoxesLayout === "classic" ? (
      <Boxes
        boxes={boxes}
        activeBox={activeBox}
        handleSelectBox={handleSelectBox}
        hideBoxZero={!boxZeroEnabled}
        onBoxLongPress={handleBoxLongPress}
        disabled={boxSelectionLocked}
        countOverrides={tutorialBoxCountOverrides ?? undefined}
        faces={boxFaces}
        countsCoachmarkId={countsCoachmarkId}
        horizontalScroll={isSmallPhoneLayout}
        maxColumns={maxColumns ?? (isTabletLayout ? 3 : undefined)}
        layoutWidth={flashcardsContentWidth}
      />
    ) : (
      <BoxesCarousel
        boxes={boxes}
        activeBox={activeBox}
        handleSelectBox={handleSelectBox}
        hideBoxZero={!boxZeroEnabled}
        onBoxLongPress={handleBoxLongPress}
        disabled={boxSelectionLocked}
        countOverrides={tutorialBoxCountOverrides ?? undefined}
        faces={boxFaces}
        layoutWidth={flashcardsContentWidth}
        bottomClearance={carouselBottomClearance}
      />
    );

  const scaledContent = (
    <View
      style={[
        styles.boxesScaledContent,
        boxesScaledHeight ? { height: boxesScaledHeight } : null,
      ]}
    >
      <CoachmarkAnchor
        id={coachmarkId ?? "flashcards-boxes-section"}
        shape="rect"
        radius={28}
      >
        <View
          collapsable={false}
          style={{
            transform: [
              { translateY: -boxesScaleOffsetY },
              { scale: boxesScale },
            ],
          }}
          onLayout={onBoxesContentLayout}
        >
          {boxesContent}
        </View>
      </CoachmarkAnchor>
    </View>
  );

  return (
    <Reanimated.View
      testID={testID ?? "flashcards-boxes-wrapper"}
      layout={screenSectionLayout}
      style={[
        styles.boxesWrapper,
        !areButtonsOnTop && styles.boxesWrapperWithBottomButtons,
        isTabletCompactBoxesLayout && styles.tabletCompactBoxesWrapper,
        flashcardsContentWidth != null
          ? { width: flashcardsContentWidth, alignSelf: "center" }
          : null,
      ]}
    >
      {shouldShowFloatingAdd && (
        <Pressable
          style={styles.addButton}
          onPress={handleManualAddFlashcards}
          disabled={addButtonDisabled}
          accessibilityLabel={t(
            "screens.flashcards.flashcards.flashcards.accessibilityLabel.dodajNoweFiszkiDoPudelek"
          )}
          accessibilityRole="button"
          accessibilityState={{ disabled: addButtonDisabled }}
        >
          <Ionicons name="add" size={26} color="#0F172A" />
        </Pressable>
      )}

      {boxesNeedScrollFallback ? (
        <ScrollView
          style={[
            styles.boxesScrollViewport,
            isTabletCompactBoxesLayout &&
              styles.tabletCompactBoxesScrollViewport,
          ]}
          contentContainerStyle={styles.boxesViewportScrollContent}
          onLayout={onBoxesViewportLayout}
          showsVerticalScrollIndicator={false}
        >
          {scaledContent}
        </ScrollView>
      ) : (
        <View
          style={[
            styles.boxesViewport,
            isTabletCompactBoxesLayout && styles.tabletCompactBoxesViewport,
          ]}
          onLayout={onBoxesViewportLayout}
        >
          {scaledContent}
        </View>
      )}
    </Reanimated.View>
  );
}
