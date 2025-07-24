import { View, Text, Button, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Button title="Back" onPress={() => router.back()} />
      <Text style={styles.text}>Login features coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  text: { fontSize: 18, marginTop: 16 },
});
