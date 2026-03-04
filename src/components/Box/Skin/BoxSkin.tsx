import BoxBottom from "@/assets/illustrations/mascot-box/body/bottom-box.png";
import LeftEyeImg from "@/assets/illustrations/mascot-box/face/left-eye-img.svgx";
import LeftPupilImg from "@/assets/illustrations/mascot-box/face/left-pupil-img.svgx";
import RightEyeImg from "@/assets/illustrations/mascot-box/face/right-eye-img.svgx";
import RightPupilImg from "@/assets/illustrations/mascot-box/face/right-pupil-img.svgx";
import BoxTop from "@/assets/illustrations/mascot-box/body/top-box.png";
import { useSettings } from "@/src/contexts/SettingsContext";
import React from "react";
import { Image, View } from "react-native";
// import Happy from "@/assets/illustrations/mascot-box/face/happy.svgx";
// import Smile from "@/assets/illustrations/mascot-box/face/smile.svgx";
// import Surprised from "@/assets/illustrations/mascot-box/face/surprised.svgx";
import { BoxCardsRow } from "./BoxCardsRow";
import { BoxMouth } from "./BoxMouth";
import { useBoxSkinStyles } from "./BoxSkin.styles";

type Face = "smile" | "happy" | "surprised";

interface BoxSkinProps {
    wordCount: number;
    face: Face;
    isActive?: boolean;
    isCaro?: boolean;
}

const BoxSkin: React.FC<BoxSkinProps> = ({ wordCount, face, isActive, isCaro }) => {
    const styles = useBoxSkinStyles();
    const { showBoxFaces } = useSettings();

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
                <>
                    <BoxMouth face={face} style={styles.mouth} />
                    <LeftPupilImg style={styles.leftpupil} width={4} height={4} />
                    <LeftEyeImg style={styles.lefteye} width={12} height={12} />
                    <RightPupilImg style={styles.rightpupil} width={4} height={4} />
                    <RightEyeImg style={styles.righteye} width={12} height={12} />
                </>
            )}
            <Image source={BoxBottom} style={styles.skin} />
        </View>
    );
};

export default BoxSkin;
