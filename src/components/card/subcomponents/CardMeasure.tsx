import { Text, View } from "react-native";
import { useStyles } from "../card-styles";

type CardMeasureProps = {
    correctionAwers: string;
    correctionRewers: string;
    correctionInput1: string;
    correctionInput2: string;
    setInput1ExpectedWidth: (width: number) => void;
    setInput2ExpectedWidth: (width: number) => void;
    setInput1TextWidth: (width: number) => void;
    setInput2TextWidth: (width: number) => void;
    input1ExpectedWidth: number;
    input2ExpectedWidth: number;
    input1TextWidth: number;
    input2TextWidth: number;
};

export function CardMeasure({
    correctionAwers,
    correctionRewers,
    correctionInput1,
    correctionInput2,
    setInput1ExpectedWidth,
    setInput2ExpectedWidth,
    setInput1TextWidth,
    setInput2TextWidth,
    input1ExpectedWidth,
    input2ExpectedWidth,
    input1TextWidth,
    input2TextWidth,
}: CardMeasureProps) {
    const styles = useStyles();

    return (
        <View
            style={styles.measureContainer}
            pointerEvents="none"
            accessible={false}
        >
            <Text
                style={styles.measureText}
                numberOfLines={1}
                onTextLayout={({ nativeEvent }) => {
                    const width = nativeEvent.lines?.[0]?.width ?? 0;
                    if (Math.abs(width - input1ExpectedWidth) > 0.5) {
                        setInput1ExpectedWidth(width);
                    }
                }}
            >
                {correctionAwers || " "}
            </Text>
            <Text
                style={styles.measureText}
                numberOfLines={1}
                onTextLayout={({ nativeEvent }) => {
                    const width = nativeEvent.lines?.[0]?.width ?? 0;
                    if (Math.abs(width - input2ExpectedWidth) > 0.5) {
                        setInput2ExpectedWidth(width);
                    }
                }}
            >
                {correctionRewers || " "}
            </Text>
            <Text
                style={styles.measureText}
                numberOfLines={1}
                onTextLayout={({ nativeEvent }) => {
                    const width = nativeEvent.lines?.[0]?.width ?? 0;
                    if (Math.abs(width - input1TextWidth) > 0.5) {
                        setInput1TextWidth(width);
                    }
                }}
            >
                {correctionInput1 || " "}
            </Text>
            <Text
                style={styles.measureText}
                numberOfLines={1}
                onTextLayout={({ nativeEvent }) => {
                    const width = nativeEvent.lines?.[0]?.width ?? 0;
                    if (Math.abs(width - input2TextWidth) > 0.5) {
                        setInput2TextWidth(width);
                    }
                }}
            >
                {correctionInput2 || " "}
            </Text>
        </View>
    );
}
