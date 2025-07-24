import React from "react";
import { View, Text, Button, Image, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function ImagePreviewScreen() {
  const router = useRouter();
  const { uri } = useLocalSearchParams<{ uri?: string }>();

  const handleCrop = () => {
    Alert.alert("Crop", "Crop functionality coming soon!");
  };
  const handleFilter = () => {
    Alert.alert("Filter", "Filter functionality coming soon!");
  };
  const handleProceed = () => {
    router.push({ pathname: "/pdfExport", params: { uri } });
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 items-center p-4">
      <View className="w-full mb-2">
        <Button title="Back" onPress={() => router.back()} color="#64748b" />
      </View>
      <Text className="text-xl font-bold my-3 text-blue-700 dark:text-blue-300">
        Preview Scan
      </Text>
      {uri ? (
        <Image
          source={{ uri }}
          className="w-11/12 h-80 rounded-lg my-4 bg-gray-100 dark:bg-gray-800"
          resizeMode="contain"
        />
      ) : (
        <Text className="text-gray-400">No image to preview.</Text>
      )}
      <View className="flex-row justify-between w-4/5 mb-4">
        <Button title="Crop" onPress={handleCrop} color="#2563eb" />
        <Button title="Filters" onPress={handleFilter} color="#2563eb" />
      </View>
      <Button title="Add to PDF" onPress={handleProceed} color="#22c55e" />
    </View>
  );
}
