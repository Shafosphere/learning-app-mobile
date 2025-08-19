// BoxesCarousel.tsx
import React, { useCallback, useMemo } from "react";
import {
  FlatList,
  Text,
  View,
  Image,
  Dimensions,
  Pressable,
} from "react-native";
import { useStyles } from "./styles_carousel";
import { BoxesState } from "@/src/types/boxes";

import BoxTop from "../../../assets/box/topBox.png";
import BoxBottom from "../../../assets/box/bottomBox.png";

interface BoxesProps {
  boxes: BoxesState;
  activeBox: keyof BoxesState | null;
  handleSelectBox: (name: keyof BoxesState) => void;
}

export default function Boxes({
  boxes,
  activeBox,
  handleSelectBox,
}: BoxesProps) {
  const { width: SCREEN_WIDTH } = Dimensions.get("window");
  const ITEM_WIDTH = Math.round(SCREEN_WIDTH * 0.3);

  const styles = useStyles();
  const transformBoxesForList = (boxesObject: BoxesState | null) => {
    const validBoxes = boxesObject || {};
    const boxKeys = Object.keys(validBoxes) as Array<keyof BoxesState>;
    return boxKeys.map((keyName) => ({
      boxName: keyName,
    }));
  };

  const data = useMemo(() => transformBoxesForList(boxes), [boxes]);

  const renderItem = useCallback(
    ({
      item,
      index,
    }: {
      item: { boxName: keyof BoxesState };
      index: number;
    }) => {
      const boxContent = boxes[item.boxName];
      return (
        <Pressable onPress={() => handleSelectBox(item.boxName)}>
          <View
            style={[
              styles.containerSkin,
              activeBox === item.boxName && styles.activeBox,
            ]}
          >
            <Image style={styles.skin} source={BoxTop} resizeMode="stretch" />
            <Image
              style={styles.skin}
              source={BoxBottom}
              resizeMode="stretch"
            />
          </View>
          <Text>{boxContent.length}</Text>
        </Pressable>
      );
    },
    [boxes, activeBox]
  );
  return (
    <View>
      <FlatList
        horizontal
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        bounces={true}
        data={data}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingHorizontal: (SCREEN_WIDTH - ITEM_WIDTH) / 2,
        }}
      />
    </View>
  );
}
