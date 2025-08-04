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
import { useEffect, useState } from "react";
import { getLanguagePairs } from "@/src/components/db/db";

export default function Profile() {
  const styles = useStyles();

  const flagMap: Record<string, any> = {
    pl: PLFlag,
    es: ESFlag,
    pm: PMFlag,
    us: USFlag,
    en: USFlag,
  };

  const [availablePairs, setAvailablePairs] = useState<
    { id: number; source_code: string; target_code: string }[]
  >([]);
  const [activeSource, setSource] = useState<string | null>(null);
  const [activeTarget, setTarget] = useState<string | null>(null);

  useEffect(() => {
    getLanguagePairs()
      .then((pairs) => {
        setAvailablePairs(pairs);
        if (pairs.length > 0) {
          setSource(pairs[0].source_code);
          setTarget(pairs[0].target_code);
        }
      })
      .catch((err) => console.error("Błąd pobierania par: ", err));
  }, []);

  const sourceLangs = Array.from(
    new Set(availablePairs.map((p) => p.source_code))
  );
  const targetLangs = Array.from(
    new Set(availablePairs.map((p) => p.target_code))
  );

  return (
    <View style={styles.container}>
      <View style={styles.minicontainer}>
        <Text style={styles.title}>Znam:</Text>
        <View style={styles.grid}>
          {sourceLangs.map((code) => {
            const FlagComp = flagMap[code.toLowerCase()];
            if (!FlagComp) return null;
            return (
              <Pressable key={code} onPress={() => setSource(code)}>
                <View
                  style={[
                    styles.flag,
                    activeSource === code && styles.flagActive,
                  ]}
                >
                  <FlagComp
                    width={styles.flag.width}
                    height={styles.flag.height}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.minicontainer}>
        <Text style={styles.title}>Chce sie nauczyć:</Text>
        <View style={styles.grid}>
          {targetLangs.map((code) => {
            const FlagComp = flagMap[code.toLowerCase()];
            if (!FlagComp) return null;
            return (
              <Pressable key={code} onPress={() => setTarget(code)}>
                <View
                  style={[
                    styles.flag,
                    activeTarget === code && styles.flagActive,
                  ]}
                >
                  <FlagComp
                    width={styles.flag.width}
                    height={styles.flag.height}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
