import Happy from "@/assets/illustrations/box/happy.svgx";
import Smile from "@/assets/illustrations/box/smile.svgx";
import Surprised from "@/assets/illustrations/box/surprised.svgx";
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
