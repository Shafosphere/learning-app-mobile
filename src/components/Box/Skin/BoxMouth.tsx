import Happy from "@/assets/illustrations/mascot-box/face/happy.svgx";
import Smile from "@/assets/illustrations/mascot-box/face/smile.svgx";
import Surprised from "@/assets/illustrations/mascot-box/face/surprised.svgx";
import React from "react";
import { ViewStyle } from "react-native";

interface BoxMouthProps {
    face: "smile" | "happy" | "surprised";
    style: ViewStyle;
}

export const BoxMouth = ({ face, style }: BoxMouthProps) => {
    const MouthComponent =
        face === "happy" ? Happy : face === "surprised" ? Surprised : Smile;

    return <MouthComponent style={style} width={18} height={18} />;
};
