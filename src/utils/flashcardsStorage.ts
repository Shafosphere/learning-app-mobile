import AsyncStorage from "@react-native-async-storage/async-storage";

export async function clearAllFlashcards() {
  const keys = await AsyncStorage.getAllKeys();
  const boxKeys = keys.filter((k) => k.startsWith("boxes:"));
  await AsyncStorage.multiRemove(boxKeys);
}
