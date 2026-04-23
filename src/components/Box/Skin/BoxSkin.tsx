import BoxBottom from "@/assets/illustrations/mascot-box/body/bottom-box.png";
import BoxTop from "@/assets/illustrations/mascot-box/body/top-box.png";
import { useSettings } from "@/src/contexts/SettingsContext";
import React from "react";
import { Image, View } from "react-native";
import { BoxCardsRow } from "./BoxCardsRow";
import { useBoxSkinStyles } from "./BoxSkin.styles";
import { BOX_FACE_ASSETS, type Face } from "./boxFaces";

interface BoxSkinProps {
    wordCount: number;
    face: Face;
    isActive?: boolean;
    isCaro?: boolean;
}

const BoxSkin: React.FC<BoxSkinProps> = ({ wordCount, face, isActive, isCaro }) => {
    const styles = useBoxSkinStyles();
    const { showBoxFaces } = useSettings();
    const faceSource = BOX_FACE_ASSETS[face];

    const accessibilityLabel = `Pudełko z ${wordCount} słowami${showBoxFaces ? `, nastrój: ${face}` : ""
        }`;

    return (
        <View
            style={[styles.containerSkin, isActive && styles.activeBox, isCaro && styles.caroPosition]}
            accessible
            accessibilityRole="image"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ selected: !!isActive }}
        >
            <Image source={BoxTop} style={styles.skin} />
            <BoxCardsRow wordCount={wordCount} styles={styles} />
            {showBoxFaces && (
                <Image
                    source={faceSource}
                    style={styles.face}
                    resizeMode="contain"
                    testID="box-skin-face"
                />
            )}
            <Image source={BoxBottom} style={styles.skin} />
        </View>
    );
};

export default BoxSkin;
