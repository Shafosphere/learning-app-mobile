import MyButton from "@/src/components/button/button";
import { View } from "react-native";
import { useStyles } from "../card-styles";

type CardActionsProps = {
    handleConfirm: () => void;
    onDownload: () => Promise<void>;
    downloadDisabled: boolean;
};

export function CardActions({
    handleConfirm,
    onDownload,
    downloadDisabled,
}: CardActionsProps) {
    const styles = useStyles();

    return (
        <View style={styles.containerButton}>
            <MyButton
                text="zatwiedź"
                color="my_green"
                disabled={false}
                onPress={handleConfirm}
            />
            <MyButton
                text="dodaj    słówka"
                color="my_yellow"
                onPress={onDownload}
                disabled={downloadDisabled}
            />
        </View>
    );
}
