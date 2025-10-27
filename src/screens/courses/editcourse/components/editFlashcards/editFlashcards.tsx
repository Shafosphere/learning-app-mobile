import { ManualCard } from "@/src/hooks/useManualCardsForm";
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
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
}

export interface ManualCardsEditorProps {
  manualCards: ManualCard[];
  styles: ManualCardsEditorStyles;
  onCardFrontChange: (cardId: string, value: string) => void;
  onCardAnswerChange: (
    cardId: string,
    answerIndex: number,
    value: string
  ) => void;
  onAddAnswer: (cardId: string) => void;
  onRemoveAnswer: (cardId: string, answerIndex: number) => void;
  onAddCard: () => void;
  onRemoveCard: (cardId: string) => void;
  onToggleFlipped: (cardId: string) => void;
  actionButtons?: ManualCardsEditorButtonConfig[];
}

export const ManualCardsEditor = ({
  manualCards,
  // styles,
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
  return (
    <>
      {manualCards.map((card, index) => {
        console.log(`Card ${index + 1} (${card.id}):`, { flipped: card.flipped });
        const isFirst = index === 0;
        const isSingleCard = manualCards.length <= 1;

        return (
          <View
            key={card.id}
            style={[styles.card, isFirst && styles.cardFirst]}
          >
            <Text style={styles.number}>{index + 1}</Text>
            <View style={styles.inputContainer}>
              <View style={styles.flipRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${card.flipped ? 'Wyłącz' : 'Włącz'} odwracanie dla fiszki ${index + 1}`}
                  onPress={() => {
                    console.log('Toggling flip for card:', { id: card.id, oldFlipped: card.flipped });
                    onToggleFlipped(card.id);
                  }}
                  hitSlop={8}
                >
                  <MaterialIcons
                    style={[
                      styles.icon,
                      card.flipped ? styles.iconFlipActivate : styles.iconFlipDeactive
                    ]}
                    name="screen-rotation-alt"
                    size={24}
                  />
                </Pressable>
                <TextInput
                  value={card.front}
                  style={styles.cardinput}
                  placeholder="przód"
                  placeholderTextColor={styles.cardPlaceholder?.color}
                  onChangeText={(value) => onCardFrontChange(card.id, value)}
                />
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
                      <TextInput
                        value={answer}
                        style={styles.answerInput}
                        placeholder={placeholder}
                        placeholderTextColor={styles.cardPlaceholder?.color}
                        onChangeText={(value) =>
                          onCardAnswerChange(card.id, answerIndex, value)
                        }
                      />
                      {card.answers.length > 1 && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Usuń odpowiedź ${
                            answerIndex + 1
                          } dla fiszki ${index + 1}`}
                          style={styles.answerRemoveButton}
                          hitSlop={8}
                          onPress={() => onRemoveAnswer(card.id, answerIndex)}
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
            <View style={styles.cardActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Usuń fiszkę ${index + 1}`}
                style={[
                  styles.cardActionButton,
                  isSingleCard && styles.removeButtonDisabled,
                ]}
                hitSlop={8}
                disabled={isSingleCard}
                onPress={() => onRemoveCard(card.id)}
              >
                <Feather
                  name="trash-2"
                  size={24}
                  color={styles.cardActionIcon?.color ?? "black"}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Dodaj tłumaczenie dla fiszki ${index + 1}`}
                style={styles.cardActionButton}
                hitSlop={8}
                onPress={() => onAddAnswer(card.id)}
              >
                <Feather
                  name="plus"
                  size={24}
                  color={styles.cardActionIcon?.color ?? "black"}
                />
              </Pressable>
            </View>
          </View>
        );
      })}

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
          onPress={onAddCard}
        >
          <Text style={styles.manualAddIcon}>+</Text>
        </Pressable>
      </View>
    </>
  );
};
