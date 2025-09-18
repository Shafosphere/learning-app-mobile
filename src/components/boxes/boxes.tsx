import { Button, Pressable, Text, View } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { useStyles } from "./styles_boxes";
import { BoxesState } from "@/src/types/boxes";
import BoxSkin from "./BoxSkin";

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
  const styles = useStyles();
  type Face = "smile" | "happy" | "surprised";

  const [faces, setFaces] = useState<Partial<Record<keyof BoxesState, Face>>>(
    {}
  );
  const timersRef = useRef<
    Partial<Record<keyof BoxesState, ReturnType<typeof setTimeout>>>
  >({});
  const activeBoxRef = useRef<typeof activeBox>(activeBox);

  useEffect(() => {
    activeBoxRef.current = activeBox;
  }, [activeBox]);

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((t) => t && clearTimeout(t));
    };
  }, []);

  const entries = Object.entries(boxes) as Array<
    [keyof BoxesState, BoxesState[keyof BoxesState]]
  >;

  return (
    <View style={styles.container}>
      <View style={styles.containerTop}>
        {entries.map(([boxName, words]) => {
          const storedFace = faces[boxName];
          const isActive = activeBox === boxName;
          const currentFace: Face =
            storedFace === "surprised"
              ? "surprised"
              : isActive
              ? "happy"
              : "smile";

          const onPress = () => {
            setFaces((prev) => ({ ...prev, [boxName]: "surprised" }));

            handleSelectBox(boxName);

            if (timersRef.current[boxName]) {
              clearTimeout(timersRef.current[boxName]!);
            }
            timersRef.current[boxName] = setTimeout(() => {
              setFaces((prev) => {
                const next = { ...prev };
                delete next[boxName];
                return next;
              });
            }, 500);
          };

          return (
            <Pressable key={boxName} onPress={onPress}>
              <BoxSkin
                wordCount={words.length}
                face={currentFace}
                isActive={activeBox === boxName}
                isCaro={false}
              />
              <Text style={styles.boxWords}>{words.length}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
