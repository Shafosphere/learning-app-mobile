// ProfilPanel.tsx
import { useStyles } from "@/src/screens/profilpanel/styles_profilpanel";
import { Image, Text, View, Pressable } from "react-native";
import Entypo from "@expo/vector-icons/Entypo";
import PL_FLAG from "../../assets/flag/PL.png";
import ES_FLAG from "../../assets/flag/ES.png";
import PM_FLAG from "../../assets/flag/PM.png";
import US_FLAG from "../../assets/flag/US.png";
import { useEffect, useState } from "react";
import { useSettings } from "@/src/contexts/SettingsContext";
import MyButton from "@/src/components/button/button";
import { useRouter } from "expo-router";
import { usePopup } from "@/src/contexts/PopupContext";

export default function ProfilPanel() {
  const {
    profiles,
    activeProfileIdx, // ⬅️ bierzemy z contextu
    setActiveProfileIdx, // ⬅️ setter z contextu
    activeProfile, // (opcjonalnie do logów)
  } = useSettings();

  const [clickedProfile, setClickedProfile] = useState<number | null>(null); // ⬅️ start od null
  const router = useRouter();
  const setPopup = usePopup();

  const flagMap: Record<string, number> = {
    pl: PL_FLAG,
    es: ES_FLAG,
    pm: PM_FLAG,
    en: US_FLAG,
  };

  useEffect(() => {
    console.log("profiles length:", profiles.length);
    console.log("profiles:", JSON.stringify(profiles, null, 2));
    console.log(
      "activeProfileIdx:",
      activeProfileIdx,
      "activeProfile:",
      activeProfile
    );
  }, [profiles, activeProfileIdx]);

  const styles = useStyles();

  const handleClick = () => {
    setPopup({
      message: "Zapisano pomyślnie!",
      color: "my_green",
      duration: 3000,
    });
  };

  const confirmSelection = async () => {
    if (clickedProfile == null) return;
    await setActiveProfileIdx(clickedProfile);
    setClickedProfile(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.minicontainer}>
        <Text style={styles.title}>Twoje profile</Text>

        {profiles.map((item, index) => (
          <Pressable
            key={index}
            onPress={() => setClickedProfile(index)}
            style={[
              styles.profilecontainer,
              index === clickedProfile && styles.clicked,
            ]}
          >
            <Image style={styles.flag} source={flagMap[item.targetLang]} />
            <Entypo style={styles.arrow} name="arrow-long-right" size={90} />
            <Image style={styles.flag} source={flagMap[item.sourceLang]} />
          </Pressable>
        ))}

        <View style={styles.buttonscontainer}>
          <MyButton
            text="nowy"
            color="my_yellow"
            onPress={() => router.push("/createprofile")}
            disabled={false}
            width={70}
          />

          <MyButton
            text="zatwierdź"
            color="my_green"
            onPress={() => {
              confirmSelection();
              handleClick();
            }}
            disabled={clickedProfile == null}
          />
        </View>
      </View>
    </View>
  );
}
