import { useStyles } from "@/src/screens/wiki/WikiScreen-styles";
import { ChevronStripe } from "@/src/screens/wiki/components/ChevronStripe";
import { WikiPeek } from "@/src/screens/wiki/components/WikiPeek";
import { useSettings } from "@/src/contexts/SettingsContext";
import { WIKI_TOPICS } from "@/src/screens/wiki/wikiTopics";
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
            <Text style={styles.peekContent}>
              {topics[selectedIndex]?.content}
            </Text>
          ) : null
        }
      />
    </ScrollView>
  );
}
