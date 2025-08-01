import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { useStyles } from "@/src/screens/profile/styles_profile";
import PLFlag from "../../assets/flag/PL.svg";
import ESFlag from "../../assets/flag/ES.svg";
import PMFlag from "../../assets/flag/PM.svg";
import USFlag from "../../assets/flag/US.svg";
import { useState } from "react";

export default function Profile() {
  const styles = useStyles();
  const [activeSource, setSource] = useState(null);
  const [activeTarget, setTarget] = useState(null);

  return (
    <View style={styles.container}>
      <View style={styles.minicontainer}>
        <Text style={styles.title}>Znam:</Text>
        <View style={styles.grid}>
          {[
            { Component: PLFlag, code: "PL" },
            { Component: ESFlag, code: "ES" },
            { Component: PMFlag, code: "PM" },
            { Component: USFlag, code: "US" },
          ].map(({ Component: FlagComp }, i) => (
            <Pressable key={i} onPress={() => setSource(i)}>
              <View
                style={[styles.flag, activeSource === i && styles.flagActive]}
              >
                <FlagComp
                  width={styles.flag.width}
                  height={styles.flag.height}
                />
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.minicontainer}>
        <Text style={styles.title}>Chce sie nauczyć:</Text>
        <View style={styles.grid}>
          {[
            { Component: PLFlag, code: "PL" },
            { Component: ESFlag, code: "ES" },
            { Component: PMFlag, code: "PM" },
            { Component: USFlag, code: "US" },
          ].map(({ Component: FlagComp }, i) => (
            <Pressable key={i} onPress={() => setTarget(i)}>
              <View
                style={[styles.flag, activeTarget === i && styles.flagActive]}
              >
                <FlagComp
                  width={styles.flag.width}
                  height={styles.flag.height}
                />
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
