import { useStyles } from "@/src/screens/wiki/WikiScreen-styles";
import { ChevronStripe } from "@/src/screens/wiki/components/ChevronStripe";
import { WikiPeek } from "@/src/screens/wiki/components/WikiPeek";
import { useSettings } from "@/src/contexts/SettingsContext";
import { WIKI_TOPICS, WikiBlock, BlockTone } from "@/src/screens/wiki/wikiTopics";
import React from "react";
import { Pressable, ScrollView, View, Text } from "react-native";

export default function WikiScreen() {
  const styles = useStyles();
  const { colors } = useSettings();
  const topics = WIKI_TOPICS;
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [blinkOn, setBlinkOn] = React.useState(true);
  const [peekVisible, setPeekVisible] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
  const openPeek = (index: number) => {
    setSelectedIndex(index);
    setPeekVisible(true);
  };
  const closePeek = () => setPeekVisible(false);
  const handleConfirm = () => {
    setPeekVisible(false);
    setCurrentIndex((prev) => Math.min(prev + 1, topics.length - 1));
  };

  React.useEffect(() => {
    const id = setInterval(() => setBlinkOn((prev) => !prev), 700);
    return () => clearInterval(id);
  }, []);

  const toneToColor = React.useCallback(
    (tone?: BlockTone) => {
      switch (tone) {
        case "green":
          return colors.my_green;
        case "yellow":
          return colors.headline;
        case "pink":
          return colors.my_red;
        default:
          return colors.headline;
      }
    },
    [colors.headline, colors.my_green, colors.my_red, colors.my_yellow],
  );

  const renderBlock = React.useCallback(
    (block: WikiBlock, index: number) => {
      if (block.type === "heading") {
        const toneColor = toneToColor(block.tone);
        return (
          <View key={`heading-${index}`} style={styles.peekHeadingRow}>
            {block.icon ? (
              <Text style={[styles.peekHeadingIcon, { color: toneColor }]}>
                {block.icon}
              </Text>
            ) : null}
            <Text style={[styles.peekHeadingText, { color: toneColor }]}>
              {block.text.toUpperCase()}
            </Text>
          </View>
        );
      }

      if (block.type === "paragraph") {
        return (
          <Text key={`paragraph-${index}`} style={styles.peekParagraph}>
            {block.text}
          </Text>
        );
      }

      if (block.type === "list") {
        const bulletColor = toneToColor(block.tone);
        return (
          <View key={`list-${index}`} style={styles.peekList}>
            {block.items.map((item, itemIndex) => (
              <View key={`list-${index}-${itemIndex}`} style={styles.peekListItem}>
                <View style={[styles.peekBullet, { backgroundColor: bulletColor }]} />
                <Text style={styles.peekListText}>{item}</Text>
              </View>
            ))}
          </View>
        );
      }

      if (block.type === "callout") {
        const toneColor = toneToColor(block.tone);
        return (
          <View
            key={`callout-${index}`}
            style={[styles.peekCallout, { borderColor: toneColor, backgroundColor: colors.background }]}
          >
            <Text style={[styles.peekCalloutText, { color: toneColor }]}>
              {block.text}
            </Text>
          </View>
        );
      }

      return null;
    },
    [
      colors.background,
      styles.peekHeadingRow,
      styles.peekHeadingIcon,
      styles.peekHeadingText,
      styles.peekParagraph,
      styles.peekList,
      styles.peekListItem,
      styles.peekBullet,
      styles.peekListText,
      styles.peekCallout,
      styles.peekCalloutText,
      toneToColor,
    ],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.boxContainer}>
        {topics.map((topic, index) => {
          const isLeft = index % 2 === 0;
          const isLast = index === topics.length - 1;
          const isCurrent = index === currentIndex;
          const isDone = index < currentIndex;
          const borderColor =
            isDone
              ? colors.my_green
              : isCurrent && blinkOn
                ? colors.my_yellow
                : colors.border;

          return (
            <React.Fragment key={index}>
              <Pressable onPress={() => openPeek(index)} hitSlop={12}>
                <View
                  style={[
                    styles.box,
                    isLeft ? styles.boxLeft : styles.boxRight,
                    { borderColor },
                  ]}
                />
              </Pressable>
              {!isLast && (
                <View style={styles.connectorArea}>
                  <ChevronStripe
                    count={5}
                    style={[
                      styles.connectorStripe,
                      isLeft
                        ? styles.connectorFromLeft
                        : styles.connectorFromRight,
                    ]}
                  />
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>
      <WikiPeek
        visible={peekVisible}
        title={selectedIndex != null ? topics[selectedIndex]?.title : undefined}
        subtitle={
          selectedIndex != null ? topics[selectedIndex]?.subtitle : undefined
        }
        onClose={closePeek}
        onConfirm={handleConfirm}
        okEnabled={selectedIndex === currentIndex}
        content={
          selectedIndex != null ? (
            <View style={styles.peekContent}>
              {topics[selectedIndex]?.blocks.map(renderBlock)}
            </View>
          ) : null
        }
      />
    </ScrollView>
  );
}
