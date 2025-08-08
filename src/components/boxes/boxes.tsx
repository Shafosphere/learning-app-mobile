import { Button, Image, Pressable, Text, View } from "react-native";
// import { useSettings } from "@/src/contexts/SettingsContext";
import { useStyles } from "./styles_boxes";
import { BoxesState } from "@/src/types/boxes";
import MyButton from "../button/button";

import BoxTop from "../../../assets/box/topBox.png";
import BoxBottom from "../../../assets/box/bottomBox.png";

interface BoxesProps {
  boxes: BoxesState;
  activeBox: keyof BoxesState | null;
  onSelectBox: (name: keyof BoxesState) => void;
  onDownload: () => Promise<void>;
}

export default function Boxes({
  boxes,
  activeBox,
  onSelectBox,
  onDownload,
}: BoxesProps) {
  const styles = useStyles();

  const entries = Object.entries(boxes) as Array<
    [keyof BoxesState, BoxesState[keyof BoxesState]]
  >;

  return (
    <View style={styles.container}>
      <View style={styles.containerTop}>
        {entries.map(([boxName, words]) => (
          <Pressable key={boxName} onPress={() => onSelectBox(boxName)}>
            <View style={styles.containerBox}>
              <View
                style={[
                  styles.containerSkin,
                  activeBox === boxName && styles.activeBox,
                ]}
              >
                <Image
                  style={styles.skin}
                  source={BoxTop}
                  resizeMode="stretch"
                />
                <Image
                  style={styles.skin}
                  source={BoxBottom}
                  resizeMode="stretch"
                />
              </View>
              <Text style={styles.boxWords}>{words.length}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <MyButton
        text="dodaj"
        color="my_yellow"
        onPress={onDownload}
        disabled={false}
      />
    </View>
  );
}
