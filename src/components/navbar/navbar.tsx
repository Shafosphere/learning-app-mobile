import { useRouter } from "expo-router";
import {
  Platform,
  Pressable,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useStyles } from "./styles_navbar";
import { Image } from "expo-image";

import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Entypo from "@expo/vector-icons/Entypo";

const logo = require("./../../../assets/box/logo.png");

export default function Navbar() {
  const router = useRouter();
  const styles = useStyles();
  const topPad = Platform.OS === "android" ? StatusBar.currentHeight : 0;

  return (
    <View style={[styles.container, { marginTop: topPad }]}>
      <TouchableOpacity onPress={() => router.push("/")}>
        <Image source={logo} style={styles.logo} />
      </TouchableOpacity>

      <Pressable
        style={({ pressed }) => [
          styles.iconCon,
          pressed && styles.iconConPressed,
        ]}
        onPress={() => router.push("/settings")}
      >
        <Entypo style={styles.icon} name="home" size={16} color="black" />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.iconCon,
          pressed && styles.iconConPressed,
        ]}
        onPress={() => router.push("/flashcards")}
      >
        <FontAwesome5 name="box-open" size={16} style={styles.icon} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.iconCon,
          pressed && styles.iconConPressed,
        ]}
        onPress={() => router.push("/settings")}
      >
        <Ionicons
          style={styles.icon}
          name="settings-sharp"
          size={16}
          color="black"
        />
      </Pressable>
    </View>
  );
}
