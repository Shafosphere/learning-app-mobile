import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Pressable, View } from "react-native";

import BoxesCarousel from "@/src/components/Box/Carousel/BoxCarousel";
import Boxes from "@/src/components/Box/List/BoxList";
import FlashcardsPeekOverlay from "@/src/components/Box/Peek/FlashcardsPeek";
import Confetti from "@/src/components/confetti/Confetti";
import { FlashcardsActions } from "@/src/components/flashcards/FlashcardsActions";
import type { TrueFalseButtonsVariant } from "@/src/contexts/SettingsContext";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "@/src/screens/flashcards/FlashcardsScreen-styles";
import { TrueFalseActions } from "@/src/screens/flashcards/TrueFalseActions";
import { BoxesState, WordWithTranslations } from "@/src/types/boxes";

export interface FlashcardsGameViewProps {
  /**
   * The main content to display in the card area.
   * Usually the <Card /> component, but can be loading/error states.
   */
  children: React.ReactNode;

  shouldCelebrate: boolean;

  // Boxes Props
  boxes: BoxesState;
  activeBox: keyof BoxesState | null;
  onSelectBox: (box: keyof BoxesState) => void;
  onBoxLongPress: (box: keyof BoxesState) => void;
  boxesLayout: "classic" | "carousel";
  hideBoxZero: boolean;
  showBoxes?: boolean;

  // Floating "Add" Button (mostly for Learning mode)
  showFloatingAdd?: boolean;
  addButtonDisabled?: boolean;
  onAddButtonPress?: () => void;

  // True/False Actions
  showTrueFalseActions: boolean;
  trueFalseActionsDisabled: boolean;
  onTrueFalseAnswer: (val: boolean) => void;
  trueFalseActionsMode?: "answer" | "ok";
  onTrueFalseOk?: () => void;
  trueFalseButtonsVariant?: TrueFalseButtonsVariant;

  // Peek Ref
  peekBox: keyof BoxesState | null;
  peekCards: WordWithTranslations[];
  activeCustomCourseId: number | null;
  activeCourseName: string | null;
  onClosePeek: () => void;

  // Optional Intro Overlay (Learning mode)
  introOverlay?: React.ReactNode;
}

export const FlashcardsGameView: React.FC<FlashcardsGameViewProps> = ({
  children,
  shouldCelebrate,
  boxes,
  activeBox,
  onSelectBox,
  onBoxLongPress,
  boxesLayout,
  hideBoxZero,
  showBoxes = true,
  showFloatingAdd = false,
  addButtonDisabled = false,
  onAddButtonPress,
  showTrueFalseActions,
  trueFalseActionsDisabled,
  onTrueFalseAnswer,
  trueFalseActionsMode = "answer",
  onTrueFalseOk,
  trueFalseButtonsVariant = "true_false",
  peekBox,
  peekCards,
  activeCustomCourseId,
  activeCourseName,
  onClosePeek,
  introOverlay,
}) => {
  const styles = useStyles();
  const { actionButtonsPosition } = useSettings();
  const shouldShowTopTrueFalse =
    actionButtonsPosition === "top" && showTrueFalseActions;

  return (
    <View style={styles.container}>
      {introOverlay}
      <Confetti generateConfetti={shouldCelebrate} />


      {children}

      {shouldShowTopTrueFalse ? (
        <View style={styles.topActionsWrapper}>
          <TrueFalseActions
            disabled={trueFalseActionsDisabled}
            onAnswer={onTrueFalseAnswer}
            onOk={onTrueFalseOk}
            mode={trueFalseActionsMode}
            dense
            variant={trueFalseButtonsVariant}
          />
        </View>
      ) : null}

      {/* Main Card Area */}
      {/* {children} */}

      {showBoxes && (
        <View style={styles.boxesWrapper}>
          {showFloatingAdd && onAddButtonPress && (
            <Pressable
              style={styles.addButton}
              onPress={onAddButtonPress}
              disabled={addButtonDisabled}
              accessibilityLabel="Dodaj nowe fiszki do pudełek"
            >
              <Ionicons name="add" size={26} color="#0F172A" />
            </Pressable>
          )}

          {boxesLayout === "classic" ? (
            <Boxes
              boxes={boxes}
              activeBox={activeBox}
              handleSelectBox={onSelectBox}
              hideBoxZero={hideBoxZero}
              onBoxLongPress={onBoxLongPress}
            />
          ) : (
            <BoxesCarousel
              boxes={boxes}
              activeBox={activeBox}
              handleSelectBox={onSelectBox}
              hideBoxZero={hideBoxZero}
              onBoxLongPress={onBoxLongPress}
            />
          )}
        </View>
      )}

      <FlashcardsActions
        placement="bottom"
        showTrueFalseActions={showTrueFalseActions}
        trueFalseActionsDisabled={trueFalseActionsDisabled}
        onTrueFalseAnswer={onTrueFalseAnswer}
        trueFalseActionsMode={trueFalseActionsMode}
        onTrueFalseOk={onTrueFalseOk}
        trueFalseButtonsVariant={trueFalseButtonsVariant}
        showCardActions={false}
      />

      <FlashcardsPeekOverlay
        visible={peekBox !== null}
        boxKey={peekBox}
        cards={peekCards}
        activeCustomCourseId={activeCustomCourseId}
        activeCourseName={activeCourseName}
        onClose={onClosePeek}
      />
    </View>
  );
};
