import { ManualCard, ManualCardType } from "@/src/hooks/useManualCardsForm";
import { saveImage } from "@/src/services/imageService";
import * as ImagePicker from "expo-image-picker";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { ReactNode, useState } from "react";
import {
  Image,
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
  cardInputPlaceholderState?: TextStyle;
  cardPlaceholder: TextStyle;
  cardDivider: ViewStyle;
  answersContainer: ViewStyle;
  answerRow: ViewStyle;
  answerIndex: TextStyle;
  answerInput: TextStyle;
  answerInputPlaceholderState?: TextStyle;
  answerRemoveButton: ViewStyle;
  cardActions: ViewStyle;
  cardActionButton: ViewStyle;
  cardActionIcon: TextStyle;
  removeButtonDisabled: ViewStyle;
  imagesRow: ViewStyle;
  imageSlot: ViewStyle;
  imageLabel: TextStyle;
  imagePreviewContainer?: ViewStyle;
  imagePreview: ViewStyle;
  imagePlaceholder: TextStyle;
  imageThumb: ViewStyle;
  imageButtonsRow: ViewStyle;
  imageButton: ViewStyle;
  imageOverlayClearButton?: ViewStyle;
  imageOverlayClearIcon?: TextStyle;
  buttonContainer: ViewStyle;
  manualAddButton: ViewStyle;
  manualAddIcon: TextStyle;
  displayCardCorrect?: ViewStyle;
  displayCardIncorrect?: ViewStyle;
  displayTextCorrect?: TextStyle;
  displayTextIncorrect?: TextStyle;
  trueFalseContainer?: ViewStyle;
  trueFalseLabel?: TextStyle;
  trueFalseOptions?: ViewStyle;
  trueFalseOption?: ViewStyle;
  trueFalseOptionTrue?: ViewStyle;
  trueFalseOptionFalse?: ViewStyle;
  trueFalseOptionText?: TextStyle;
  trueFalseOptionTextActive?: TextStyle;
  explanationContainer?: ViewStyle;
  explanationLabel?: TextStyle;
  explanationInput?: TextStyle;
  explanationInputPlaceholderState?: TextStyle;
  cardActionsImage?: ViewStyle;
  cardActionButtonAddImage?: ViewStyle;
  imageClearButton?: ViewStyle;
  imageClearIcon?: TextStyle;
}

export interface ManualCardsEditorProps {
  manualCards: ManualCard[];
  styles: ManualCardsEditorStyles;
  mode?: "edit" | "display";
  displayAction?: ManualCardsDisplayAction;
  displayStatuses?: Record<string, ManualCardDisplayStatus | undefined>;
  cardType?: ManualCardType;
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
  onCardImageChange?: (
    cardId: string,
    side: "front" | "back",
    uri: string | null
  ) => void;
  onCardExplanationChange?: (cardId: string, value: string) => void;
  actionButtons?: ManualCardsEditorButtonConfig[];
  showDefaultBottomAddButton?: boolean;
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
  cardType,
  onCardFrontChange,
  onCardAnswerChange,
  onAddAnswer,
  onRemoveAnswer,
  onAddCard,
  onRemoveCard,
  onToggleFlipped,
  onCardImageChange,
  onCardExplanationChange,
  actionButtons,
  showDefaultBottomAddButton = true,
}: ManualCardsEditorProps) => {
  const styles = useStyles();
  const [openImageSlots, setOpenImageSlots] = useState<Record<string, boolean>>(
    {}
  );
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
  const handleCardImageChange =
    onCardImageChange ??
    (() => {
      // no-op in display mode
    });
  const handleExplanationChange =
    onCardExplanationChange ??
    (() => {
      // no-op in display mode
    });

  const pickImage = async (cardId: string, side: "front" | "back") => {
    if (isDisplayMode) return;
    const imageMediaType =
      (ImagePicker as any).MediaType?.Images ??
      (ImagePicker as any).MediaTypeOptions?.Images ??
      ImagePicker.MediaTypeOptions.Images;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: imageMediaType,
      quality: 0.8,
      allowsEditing: false,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }
    try {
      const saved = await saveImage(result.assets[0].uri);
      handleCardImageChange(cardId, side, saved);
    } catch (error) {
      console.warn("[ManualCardsEditor] Failed to save picked image", error);
    }
  };

  const clearImage = (cardId: string, side: "front" | "back") => {
    if (isDisplayMode) return;
    handleCardImageChange(cardId, side, null);
  };

  const closeImageSlot = (cardId: string) => {
    setOpenImageSlots((prev) => ({
      ...prev,
      [cardId]: false,
    }));
  };

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
        const effectiveCardType: ManualCardType =
          card.type ?? cardType ?? "text";
        const isTrueFalseType = effectiveCardType === "true_false";
        const isKnowDontKnowType = effectiveCardType === "know_dont_know";
        const isBooleanCardType =
          isTrueFalseType || isKnowDontKnowType;
        const canEditImages = !isDisplayMode && Boolean(onCardImageChange);
        const hasFrontImage = Boolean(card.imageFront);
        const hasLegacyBackImage = Boolean(card.imageBack);
        const hasAnyImage = hasFrontImage || hasLegacyBackImage;
        const imageSideToClear: "front" | "back" = hasFrontImage ? "front" : "back";
        const shouldShowImagesRow =
          hasAnyImage || openImageSlots[card.id];
        const trueFalseValue =
          card.answers[0]?.toLowerCase() === "false" ? "false" : "true";
        const showFrontInput = true;

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
                  {!isDisplayMode && !isBooleanCardType && (
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
                  {showFrontInput ? (
                    isDisplayMode ? (
                      <Text
                        style={[
                          styles.cardinput,
                          displayStatus === "correct" &&
                            styles.displayTextCorrect,
                          displayStatus === "incorrect" &&
                            styles.displayTextIncorrect,
                        ]}
                      >
                        {card.front?.trim().length ? card.front : "—"}
                      </Text>
                    ) : (
                      <TextInput
                        value={card.front}
                        style={[
                          styles.cardinput,
                          !card.front?.trim().length &&
                            styles.cardInputPlaceholderState,
                        ]}
                        placeholder="Awers"
                        placeholderTextColor={styles.cardPlaceholder?.color}
                        onChangeText={(value) =>
                          handleFrontChange(card.id, value)
                        }
                      />
                    )
                  ) : null}
              </View>
              <View style={styles.cardDivider} />
              {shouldShowImagesRow ? (
                <>
                  <View style={[styles.imagesRow, styles.imagesRowSingle]}>
                    <View style={[styles.imageSlot, styles.imageSlotFull]}>
                      <Pressable
                        onPress={() => pickImage(card.id, "front")}
                        disabled={!canEditImages}
                        hitSlop={6}
                        style={({ pressed }) => [
                          styles.imagePreview,
                          pressed && canEditImages
                            ? { opacity: 0.85 }
                            : null,
                        ]}
                      >
                        {card.imageFront || card.imageBack ? (
                          <Image
                            source={{ uri: (card.imageFront ?? card.imageBack) as string }}
                            style={styles.imageThumb}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={styles.imagePlaceholder}>
                            {canEditImages ? "Dodaj obraz" : "Brak"}
                          </Text>
                        )}
                      </Pressable>
                      {shouldShowImagesRow && canEditImages ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Usuń obraz lub zamknij pole obrazu dla fiszki ${
                            index + 1
                          }`}
                          hitSlop={8}
                          onPress={() => {
                            clearImage(card.id, imageSideToClear);
                            closeImageSlot(card.id);
                          }}
                          style={styles.imageOverlayClearButton}
                        >
                          <Feather
                            name="x"
                            size={16}
                            color={styles.imageOverlayClearIcon?.color ?? "#FFFFFF"}
                          />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.cardDivider} />
                </>
              ) : null}
              <View style={styles.answersContainer}>
                {isTrueFalseType ? (
                  <View style={styles.trueFalseContainer}>
                    <Text style={styles.trueFalseLabel}>Odpowiedź</Text>
                    <View style={styles.trueFalseOptions}>
                      {[
                        {
                          key: "true",
                          label: "Prawda",
                        },
                        {
                          key: "false",
                          label: "Fałsz",
                        },
                      ].map((option) => {
                        const isActive = trueFalseValue === option.key;
                        const isFalse = option.key === "false";
                        return (
                          <Pressable
                            key={option.key}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isActive }}
                            accessibilityLabel={`${option.label} dla fiszki ${
                              index + 1
                            }`}
                            style={[
                              styles.trueFalseOption,
                              isActive &&
                                (isFalse
                                  ? styles.trueFalseOptionFalse
                                  : styles.trueFalseOptionTrue),
                            ]}
                            hitSlop={6}
                            disabled={isDisplayMode}
                            onPress={() =>
                              handleAnswerChange(card.id, 0, option.key)
                            }
                          >
                            <Text
                              style={[
                                styles.trueFalseOptionText,
                                isActive && styles.trueFalseOptionTextActive,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : isKnowDontKnowType ? null : (
                  card.answers.map((answer, answerIndex) => {
                    const placeholder = "Rewers";
                    return (
                      <View
                        key={`${card.id}-answer-${answerIndex}`}
                        style={styles.answerRow}
                      >
                        <Text style={styles.answerIndex}>
                          {answerIndex + 1}.
                        </Text>
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
                            style={[
                              styles.answerInput,
                              !answer?.trim().length &&
                                styles.answerInputPlaceholderState,
                            ]}
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
                  })
                )}
                {!isKnowDontKnowType ? (
                  <View style={styles.explanationContainer}>
                    <Text style={styles.explanationLabel}>Explanation</Text>
                    {isDisplayMode ? (
                      <Text style={styles.explanationInput}>
                        {card.explanation?.trim().length ? card.explanation : "—"}
                      </Text>
                    ) : (
                      <TextInput
                        value={card.explanation ?? ""}
                        style={[
                          styles.explanationInput,
                          !(card.explanation ?? "").trim().length &&
                            styles.explanationInputPlaceholderState,
                        ]}
                        placeholder="opcjonalnie"
                        placeholderTextColor={styles.cardPlaceholder?.color}
                        onChangeText={(value) =>
                          handleExplanationChange(card.id, value)
                        }
                      />
                    )}
                  </View>
                ) : null}
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
                        onPress={() => displayAction?.onPress?.(card, index)}
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
                    {!isBooleanCardType && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Dodaj tłumaczenie dla fiszki ${
                          index + 1
                        }`}
                        style={[
                          styles.cardActionButton,
                        ]}
                        hitSlop={8}
                        onPress={() => handleAddAnswerPress(card.id)}
                      >
                        <Feather
                          name="plus"
                          size={24}
                          color={styles.cardActionIcon?.color ?? "black"}
                        />
                      </Pressable>
                    )}
                    {canEditImages && !hasFrontImage ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Dodaj obrazek dla fiszki ${index + 1}`}
                        style={[
                          styles.cardActionButton,
                          styles.cardActionButtonAddImage,
                        ]}
                        hitSlop={8}
                        onPress={() =>
                          setOpenImageSlots((prev) => ({
                            ...prev,
                            [card.id]: true,
                          }))
                        }
                      >
                        <Feather
                          name="image"
                          size={22}
                          color={styles.cardActionIcon?.color ?? "black"}
                        />
                      </Pressable>
                    ) : null}
                    {hasFrontImage && canEditImages ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Usuń obraz dla fiszki ${index + 1}`}
                        style={[
                          styles.cardActionButton,
                          styles.imageClearButton,
                        ]}
                        hitSlop={8}
                        onPress={() => clearImage(card.id, "front")}
                      >
                        <Feather
                          name="x"
                          size={22}
                          color={styles.imageClearIcon?.color ?? "#D72638"}
                        />
                      </Pressable>
                    ) : null}
                  </>
                )}
              </View>
            )}
          </View>
        );
      })}

      {!isDisplayMode && showDefaultBottomAddButton && (
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
