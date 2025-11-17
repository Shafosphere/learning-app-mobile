import { ManualCard } from "@/src/hooks/useManualCardsForm";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { ReactNode } from "react";
import {
  Pressable,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useStyles } from "./editFlashcards-styles";
export interface ManualCardsEditorButtonConfig {
  key: string;
  onPress: () => void;
  accessibilityLabel: string;
  content: ReactNode;
  disabled?: boolean;
}

export interface ManualCardsEditorStyles {
  card: ViewStyle;
  cardFirst?: ViewStyle;
  number: TextStyle;
  inputContainer: ViewStyle;
  cardinput: TextStyle;
  cardPlaceholder: TextStyle;
  cardDivider: ViewStyle;
  answersContainer: ViewStyle;
  answerRow: ViewStyle;
  answerIndex: TextStyle;
  answerInput: TextStyle;
  answerRemoveButton: ViewStyle;
  cardActions: ViewStyle;
  cardActionButton: ViewStyle;
  cardActionIcon: TextStyle;
  removeButtonDisabled: ViewStyle;
  buttonContainer: ViewStyle;
  manualAddButton: ViewStyle;
  manualAddIcon: TextStyle;
  displayCardCorrect?: ViewStyle;
  displayCardIncorrect?: ViewStyle;
  displayTextCorrect?: TextStyle;
  displayTextIncorrect?: TextStyle;
}

export interface ManualCardsEditorProps {
  manualCards: ManualCard[];
  styles: ManualCardsEditorStyles;
  mode?: "edit" | "display";
  displayAction?: ManualCardsDisplayAction;
  displayStatuses?: Record<string, ManualCardDisplayStatus | undefined>;
  onCardFrontChange?: (cardId: string, value: string) => void;
  onCardAnswerChange?: (
    cardId: string,
    answerIndex: number,
    value: string
  ) => void;
  onAddAnswer?: (cardId: string) => void;
  onRemoveAnswer?: (cardId: string, answerIndex: number) => void;
  onAddCard?: () => void;
  onRemoveCard?: (cardId: string) => void;
  onToggleFlipped?: (cardId: string) => void;
  actionButtons?: ManualCardsEditorButtonConfig[];
}

export interface ManualCardsDisplayAction {
  icon: ReactNode | ((card: ManualCard, index: number) => ReactNode);
  onPress?: (card: ManualCard, index: number) => void;
  accessibilityLabel?: string | ((card: ManualCard, index: number) => string);
}

export type ManualCardDisplayStatus = "pending" | "correct" | "incorrect";

export const ManualCardsEditor = ({
  manualCards,
  styles: _deprecatedExternalStyles,
  mode = "edit",
  displayAction,
  displayStatuses,
  onCardFrontChange,
  onCardAnswerChange,
  onAddAnswer,
  onRemoveAnswer,
  onAddCard,
  onRemoveCard,
  onToggleFlipped,
  actionButtons,
}: ManualCardsEditorProps) => {
  const styles = useStyles();
  const isDisplayMode = mode === "display";
  const handleFrontChange =
    onCardFrontChange ??
    (() => {
      // no-op in display mode
    });
  const handleAnswerChange =
    onCardAnswerChange ??
    (() => {
      // no-op in display mode
    });
  const handleAddAnswerPress =
    onAddAnswer ??
    (() => {
      // no-op in display mode
    });
  const handleRemoveAnswerPress =
    onRemoveAnswer ??
    (() => {
      // no-op in display mode
    });
  const handleAddCardPress =
    onAddCard ??
    (() => {
      // no-op in display mode
    });
  const handleRemoveCardPress =
    onRemoveCard ??
    (() => {
      // no-op in display mode
    });
  const handleToggleFlippedPress =
    onToggleFlipped ??
    (() => {
      // no-op in display mode
    });

  return (
    <>
      {manualCards.map((card, index) => {
        console.log(`Card ${index + 1} (${card.id}):`, {
          flipped: card.flipped,
        });
        const isFirst = index === 0;
        const isSingleCard = manualCards.length <= 1;
        const displayStatus = displayStatuses?.[card.id];
        const resolvedDisplayIcon =
          typeof displayAction?.icon === "function"
            ? displayAction.icon(card, index)
            : displayAction?.icon;
        const resolvedAccessibilityLabel =
          typeof displayAction?.accessibilityLabel === "function"
            ? displayAction.accessibilityLabel(card, index)
            : displayAction?.accessibilityLabel;

        return (
          <View
            key={card.id}
            style={[
              styles.card,
              isFirst && styles.cardFirst,
              isDisplayMode &&
                displayStatus === "correct" &&
                styles.displayCardCorrect,
              isDisplayMode &&
                displayStatus === "incorrect" &&
                styles.displayCardIncorrect,
            ]}
          >
            <Text
              style={[
                styles.number,
                isDisplayMode &&
                  displayStatus === "correct" &&
                  styles.displayTextCorrect,
                isDisplayMode &&
                  displayStatus === "incorrect" &&
                  styles.displayTextIncorrect,
              ]}
            >
              {index + 1}
            </Text>
            <View style={styles.inputContainer}>
              <View style={styles.flipRow}>
                {!isDisplayMode && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${
                      card.flipped ? "Wyłącz" : "Włącz"
                    } odwracanie dla fiszki ${index + 1}`}
                    onPress={() => {
                      console.log("Toggling flip for card:", {
                        id: card.id,
                        oldFlipped: card.flipped,
                      });
                      handleToggleFlippedPress(card.id);
                    }}
                    hitSlop={8}
                  >
                    <View style={styles.lockcontainer}>
                      {card.flipped ? (
                        <FontAwesome5
                          style={[styles.icon, styles.iconFlipActivate]}
                          name="lock-open"
                          size={16}
                        />
                      ) : (
                        <FontAwesome
                          style={[styles.icon, styles.iconFlipDeactive]}
                          name="lock"
                          size={21}
                        />
                      )}
                    </View>
                  </Pressable>
                )}
                {isDisplayMode ? (
                  <Text
                    style={[
                      styles.cardinput,
                      displayStatus === "correct" && styles.displayTextCorrect,
                      displayStatus === "incorrect" &&
                        styles.displayTextIncorrect,
                    ]}
                  >
                    {card.front?.trim().length ? card.front : "—"}
                  </Text>
                ) : (
                  <TextInput
                    value={card.front}
                    style={styles.cardinput}
                    placeholder="przód"
                    placeholderTextColor={styles.cardPlaceholder?.color}
                    onChangeText={(value) => handleFrontChange(card.id, value)}
                  />
                )}
              </View>
              <View style={styles.cardDivider} />
              <View style={styles.answersContainer}>
                {card.answers.map((answer, answerIndex) => {
                  const placeholder =
                    answerIndex === 0 ? "tył" : `tył ${answerIndex + 1}`;
                  return (
                    <View
                      key={`${card.id}-answer-${answerIndex}`}
                      style={styles.answerRow}
                    >
                      <Text style={styles.answerIndex}>{answerIndex + 1}.</Text>
                      {isDisplayMode ? (
                        <Text
                          style={[
                            styles.answerInput,
                            displayStatus === "correct" &&
                              styles.displayTextCorrect,
                            displayStatus === "incorrect" &&
                              styles.displayTextIncorrect,
                          ]}
                        >
                          {answer?.trim().length ? answer : "—"}
                        </Text>
                      ) : (
                        <TextInput
                          value={answer}
                          style={styles.answerInput}
                          placeholder={placeholder}
                          placeholderTextColor={styles.cardPlaceholder?.color}
                          onChangeText={(value) =>
                            handleAnswerChange(card.id, answerIndex, value)
                          }
                        />
                      )}
                      {!isDisplayMode && card.answers.length > 1 && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Usuń odpowiedź ${
                            answerIndex + 1
                          } dla fiszki ${index + 1}`}
                          style={styles.answerRemoveButton}
                          hitSlop={8}
                          onPress={() =>
                            handleRemoveAnswerPress(card.id, answerIndex)
                          }
                        >
                          <Feather
                            name="minus-circle"
                            size={20}
                            color={styles.cardActionIcon?.color ?? "black"}
                          />
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
            {(!isDisplayMode || (isDisplayMode && resolvedDisplayIcon)) && (
              <View style={styles.cardActions}>
                {isDisplayMode ? (
                  <>
                    {resolvedDisplayIcon ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          resolvedAccessibilityLabel ??
                          `Akcja dla fiszki ${index + 1}`
                        }
                        style={styles.cardActionButton}
                        hitSlop={8}
                        onPress={() =>
                          displayAction?.onPress?.(card, index)
                        }
                      >
                        {resolvedDisplayIcon}
                      </Pressable>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Usuń fiszkę ${index + 1}`}
                      style={[
                        styles.cardActionButton,
                        isSingleCard && styles.removeButtonDisabled,
                      ]}
                      hitSlop={8}
                      disabled={isSingleCard}
                      onPress={() => handleRemoveCardPress(card.id)}
                    >
                      <Feather
                        name="trash-2"
                        size={24}
                        color={styles.cardActionIcon?.color ?? "black"}
                      />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Dodaj tłumaczenie dla fiszki ${
                        index + 1
                      }`}
                      style={styles.cardActionButton}
                      hitSlop={8}
                      onPress={() => handleAddAnswerPress(card.id)}
                    >
                      <Feather
                        name="plus"
                        size={24}
                        color={styles.cardActionIcon?.color ?? "black"}
                      />
                    </Pressable>
                  </>
                )}
              </View>
            )}
          </View>
        );
      })}

      {!isDisplayMode && (
        <View style={styles.buttonContainer}>
          {actionButtons?.map((action) => (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel}
              style={styles.manualAddButton}
              accessibilityState={{ disabled: !!action.disabled }}
              disabled={action.disabled}
              onPress={action.disabled ? undefined : action.onPress}
            >
              {action.content}
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dodaj nową fiszkę"
            style={styles.manualAddButton}
            onPress={handleAddCardPress}
          >
            <Text style={styles.manualAddIcon}>+</Text>
          </Pressable>
        </View>
      )}
    </>
  );
};
