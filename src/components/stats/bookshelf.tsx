import REWARD_IMAGE from "@/assets/rewards/reward1.png";
import { useAchievements } from "@/src/hooks/useAchievements";
import { createThemeStylesHook } from "@/src/theme/createThemeStylesHook";
import React, { useCallback, useEffect, useState } from "react";
import { LayoutChangeEvent, Pressable, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import StatsCard from "./StatsCard";

const BLOCK_WIDTH = 60;
const BLOCK_HEIGHT = 60;
const BLOCK_GAP = 8;
const BLOCK_BOTTOM_OFFSET = 6;

// --- Types ---

interface ShelfLayout {
  y: number;
  height: number;
  index: number;
}

interface BlockData {
  id: string; // achievement id
  x: number;
  y: number;
  icon?: any; // placeholder for now
}

// --- Styles ---

const useStyles = createThemeStylesHook((colors) => ({
  container: {
    alignItems: "center",
    gap: 16,
    paddingVertical: 16,
  },
  cupboard: {
    width: 320, // Widened from 220
    height: 360,
    backgroundColor: "#cb8a57",
    borderRadius: 24,
    padding: 12,
    paddingTop: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
    zIndex: 10,
  },
  cupboardFrame: {
    backgroundColor: "#e7b480",
    borderRadius: 18,
    padding: 8,
    paddingTop: 10,
    flex: 1,
    gap: 10,
    zIndex: 20,
  },
  shelf: {
    height: 60,
    backgroundColor: "#e6b077",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 0,
    elevation: 3,
    marginBottom: 0,
    justifyContent: "center",
    borderBottomWidth: 4,
    borderBottomColor: "#cb8a57",
  },
  block: {
    position: "absolute",
    width: BLOCK_WIDTH,
    height: BLOCK_HEIGHT,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 7,
    elevation: 100,
    zIndex: 999,
  },
  lockButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  lockButtonActive: {
    backgroundColor: colors.my_green,
    borderColor: colors.my_green,
    shadowOpacity: 0.2,
  },
  lockIcon: {
    fontSize: 14,
    color: colors.headline,
  },
  lockIconActive: {
    color: colors.darkbg,
  },
  emptyText: {
    position: "absolute",
    alignSelf: "center",
    top: "45%",
    color: "rgba(0,0,0,0.3)",
    fontStyle: "italic",
  },
}));

// --- Draggable Block Component ---

const DraggableBlock = ({
  data,
  shelvesLayout,
  frameLayout,
  isEditMode,
  onDrop,
  onFall,
}: {
  data: BlockData;
  shelvesLayout: ShelfLayout[];
  frameLayout: { width: number; height: number };
  isEditMode: boolean;
  onDrop: (id: string, x: number, y: number) => void;
  onFall: (id: string) => void;
}) => {
  const styles = useStyles();
  const x = useSharedValue(data.x);
  const y = useSharedValue(data.y);
  const isDragging = useSharedValue(false);
  const scale = useSharedValue(1);
  const rotate = useSharedValue("0deg");

  const startX = useSharedValue(data.x);
  const startY = useSharedValue(data.y);

  // Update position when data changes (e.g. initial layout)
  useEffect(() => {
    x.value = withSpring(data.x);
    y.value = withSpring(data.y);
  }, [data.x, data.y]);

  const pan = Gesture.Pan()
    .enabled(isEditMode)
    .activeOffsetY([-5, 5])
    .activeOffsetX([-5, 5])
    .onStart(() => {
      isDragging.value = true;
      startX.value = x.value;
      startY.value = y.value;
      scale.value = withSpring(1.1);
    })
    .onUpdate((event) => {
      const newX = startX.value + event.translationX;
      const newY = startY.value + event.translationY;
      const maxX = frameLayout.width - BLOCK_WIDTH;
      const maxY = frameLayout.height + 50;
      x.value = Math.max(-20, Math.min(newX, maxX + 20));
      y.value = Math.max(-20, Math.min(newY, maxY));
    })
    .onEnd(() => {
      isDragging.value = false;
      scale.value = withSpring(1);

      const cy = y.value + BLOCK_HEIGHT / 2;
      let targetShelf: ShelfLayout | null = null;
      for (const shelf of shelvesLayout) {
        if (cy >= shelf.y && cy <= shelf.y + shelf.height) {
          targetShelf = shelf;
          break;
        }
      }

      if (targetShelf) {
        const snappedY =
          targetShelf.y +
          targetShelf.height -
          BLOCK_HEIGHT -
          BLOCK_BOTTOM_OFFSET;
        y.value = withSpring(snappedY);
        const clampedX = Math.max(
          0,
          Math.min(x.value, frameLayout.width - BLOCK_WIDTH)
        );
        runOnJS(onDrop)(data.id, clampedX, snappedY);
      } else {
        y.value = withTiming(frameLayout.height + 100, { duration: 600 });
        rotate.value = withTiming("10deg", { duration: 600 }, (finished) => {
          if (finished) {
            runOnJS(onFall)(data.id);
          }
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
      { rotate: rotate.value },
    ],
    zIndex: isDragging.value ? 1000 : 100,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.Image
        source={REWARD_IMAGE}
        style={[styles.block, animatedStyle]}
        resizeMode="contain"
      />
    </GestureDetector>
  );
};

const Shelf = ({
  index,
  onLayout,
}: {
  index: number;
  onLayout: (e: LayoutChangeEvent) => void;
}) => {
  const styles = useStyles();
  return <Animated.View style={styles.shelf} onLayout={onLayout} />;
};

// --- Main Component ---

export default function DragShelves({
  onEditModeChange,
}: {
  onEditModeChange?: (isEditing: boolean) => void;
}) {
  const styles = useStyles();
  const [shelvesLayout, setShelvesLayout] = useState<ShelfLayout[]>([]);
  const [frameLayout, setFrameLayout] = useState({ width: 0, height: 0 });
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);

  const { unlocked } = useAchievements();

  const toggleEditMode = () => {
    const newMode = !isEditMode;
    setIsEditMode(newMode);
    onEditModeChange?.(newMode);
  };

  const onLayoutShelf = useCallback(
    (event: LayoutChangeEvent, index: number) => {
      const layout = event.nativeEvent.layout;
      setShelvesLayout((prev) => {
        // Only update if changed significantly to avoid loops
        const existing = prev.find((s) => s.index === index);
        if (
          existing &&
          Math.abs(existing.y - layout.y) < 2 &&
          Math.abs(existing.height - layout.height) < 2
        )
          return prev;

        const filtered = prev.filter((s) => s.index !== index);
        return [
          ...filtered,
          { y: layout.y, height: layout.height, index },
        ].sort((a, b) => a.index - b.index);
      });
    },
    []
  );

  const onLayoutFrame = (event: LayoutChangeEvent) => {
    setFrameLayout(event.nativeEvent.layout);
  };

  // Populate blocks when achievements or layout changes
  useEffect(() => {
    if (frameLayout.width === 0 || shelvesLayout.length === 0) return;

    // Simple layout algorithm: fill shelves top to bottom, left to right
    // Max blocks per shelf:
    const shelfWidth = frameLayout.width;
    const itemsPerShelf = Math.floor(
      (shelfWidth - 10) / (BLOCK_WIDTH + BLOCK_GAP)
    );

    const newBlocks: BlockData[] = unlocked
      .map((ach, index) => {
        const shelfIndex = Math.floor(index / itemsPerShelf);
        const slotIndex = index % itemsPerShelf;

        const shelf = shelvesLayout[shelfIndex];
        if (!shelf) return null; // Overflow or no shelf

        const x = 12 + slotIndex * (BLOCK_WIDTH + BLOCK_GAP);
        const y = shelf.y + shelf.height - BLOCK_HEIGHT - BLOCK_BOTTOM_OFFSET;

        return {
          id: ach.id,
          x,
          y,
        };
      })
      .filter(Boolean) as BlockData[];

    setBlocks(newBlocks);
  }, [unlocked, shelvesLayout, frameLayout]);

  const handleDrop = (id: string, x: number, y: number) => {
    // We don't persist drag changes yet, just local visual update
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, x, y } : b)));
  };

  const handleFall = (id: string) => {
    // If it falls, it just disappears from view until reload/reset
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <StatsCard
      title="Półki postępów"
      action={
        unlocked.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isEditMode
                ? "Zablokuj układ półek"
                : "Odblokuj układ półek"
            }
            hitSlop={10}
            onPress={toggleEditMode}
            style={[
              styles.lockButton,
              isEditMode && styles.lockButtonActive,
            ]}
          >
            <FontAwesome
              name={isEditMode ? "unlock-alt" : "lock"}
              size={16}
              style={[
                styles.lockIcon,
                isEditMode && styles.lockIconActive,
              ]}
            />
          </Pressable>
        ) : undefined
      }
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <View style={styles.cupboard}>
            <View style={styles.cupboardFrame} onLayout={onLayoutFrame}>
              {[0, 1, 2, 3].map((i) => (
                <Shelf
                  key={i}
                  index={i}
                  onLayout={(e) => onLayoutShelf(e, i)}
                />
              ))}

              {blocks.length === 0 && unlocked.length === 0 && (
                <Text style={styles.emptyText}>Brak osiągnięć...</Text>
              )}

              {blocks.map((block) => (
                <DraggableBlock
                  key={block.id}
                  data={block}
                  shelvesLayout={shelvesLayout}
                  frameLayout={frameLayout}
                  isEditMode={isEditMode}
                  onDrop={handleDrop}
                  onFall={handleFall}
                />
              ))}
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </StatsCard>
  );
}
