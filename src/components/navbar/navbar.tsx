import { useRouter } from "expo-router";
import {
  Platform,
  Pressable,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useStyles } from "./navbar-styles";
import { Image } from "expo-image";
import { useSettings } from "@/src/contexts/SettingsContext";
import { useStreak } from "@/src/contexts/StreakContext";

import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Entypo from "@expo/vector-icons/Entypo";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import FontAwesome from "@expo/vector-icons/FontAwesome";

const logo = require("@/assets/illustrations/box/logo.png");

export default function Navbar() {
  const router = useRouter();
  const { toggleTheme, activeCustomProfileId } = useSettings();
  const { streakCount } = useStreak();
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
        onPress={() => router.push("/")}
      >
        <Entypo style={styles.icon} name="home" size={16} color="black" />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.iconCon,
          pressed && styles.iconConPressed,
        ]}
        onPress={() =>
          activeCustomProfileId != null
            ? router.push("/flashcards_custom")
            : router.push("/level")
        }
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

      <Pressable
        style={({ pressed }) => [
          styles.iconCon,
          pressed && styles.iconConPressed,
        ]}
        onPress={() => router.push("/profilpanel")}
      >
        <FontAwesome style={styles.icon} name="flag" size={16} color="black" />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.iconCon,
          pressed && styles.iconConPressed,
        ]}
        onPress={() => router.push("/review")}
      >
        <Ionicons style={styles.icon} name="repeat" size={16} color="black" />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.iconCon,
          pressed && styles.iconConPressed,
        ]}
        onPress={() => router.push("/stats")}
      >
        <Ionicons
          style={styles.icon}
          name="stats-chart"
          size={16}
          color="black"
        />
      </Pressable>

      {/* Spacer to push theme + streak to the right */}
      <View style={{ flex: 1 }} />

      <Pressable
        style={({ pressed }) => [
          styles.iconCon,
          pressed && styles.iconConPressed,
        ]}
        onPress={toggleTheme}
      >
        <MaterialIcons
          style={styles.icon}
          name="dark-mode"
          size={16}
          color="black"
        />
      </Pressable>

      <Text style={styles.streakText}>{streakCount}</Text>
    </View>
  );
}
