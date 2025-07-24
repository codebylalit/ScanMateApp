import { View, Text, Button } from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();
  return (
    <View className="flex-1 justify-center items-center p-4 bg-white dark:bg-gray-900">
      <Text className="text-4xl font-bold mb-4 text-blue-700 dark:text-blue-300">ScanMate</Text>
      <Text className="text-lg mb-2 text-gray-700 dark:text-gray-200">Recent PDFs</Text>
      {/* Placeholder for recent PDFs */}
      <View className="h-32 w-full justify-center items-center mb-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
        <Text className="text-gray-400">No PDFs yet.</Text>
      </View>
      <View className="w-full">
        <Button title="Scan Document" onPress={() => router.push("/camera")} color="#2563eb" />
      </View>
    </View>
  );
}
