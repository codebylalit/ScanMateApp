import React, { useState } from "react";
import { View, Text, Button, Image, FlatList, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system";
import { PDFDocument } from "pdf-lib";
import Share from "react-native-share";

function PDFExportScreen() {
  const router = useRouter();
  const { uri } = useLocalSearchParams<{ uri?: string }>();
  const [images, setImages] = useState<string[]>(uri ? [uri] : []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfPath, setPdfPath] = useState<string | null>(null);

  const addAnotherPage = () => {
    router.push("/camera"); // Go back to camera to scan another page
  };

  React.useEffect(() => {
    if (uri && !images.includes(uri)) {
      setImages((prev) => [...prev, uri]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const pdfDoc = await PDFDocument.create();
      for (const imgUri of images) {
        const imgBytes = await FileSystem.readAsStringAsync(imgUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const jpgImage = await pdfDoc.embedJpg(imgBytes);
        const page = pdfDoc.addPage([jpgImage.width, jpgImage.height]);
        page.drawImage(jpgImage, {
          x: 0,
          y: 0,
          width: jpgImage.width,
          height: jpgImage.height,
        });
      }
      const pdfBytes = await pdfDoc.save();
      const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
      const path = FileSystem.documentDirectory + `ScanMate_${Date.now()}.pdf`;
      await FileSystem.writeAsStringAsync(path, pdfBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setPdfPath(path);
      Alert.alert("Success", `PDF saved to: ${path}`);
    } catch (e) {
      Alert.alert("Error", "Failed to generate PDF: " + e);
    }
    setIsGenerating(false);
  };

  const sharePDF = async () => {
    if (!pdfPath) return;
    try {
      await Share.open({
        url: `file://${pdfPath}`,
        type: "application/pdf",
        failOnCancel: false,
      });
    } catch (e) {
      Alert.alert("Error", "Failed to share PDF: " + e);
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 items-center p-4">
      <View className="w-full mb-2">
        <Button title="Back" onPress={() => router.back()} color="#64748b" />
      </View>
      <Text className="text-xl font-bold my-3 text-blue-700 dark:text-blue-300">
        Export PDF
      </Text>
      <FlatList
        data={images}
        keyExtractor={(item, idx) => item + idx}
        renderItem={({ item, index }) => (
          <View className="my-2 items-center">
            <Text className="text-gray-700 dark:text-gray-200">
              Page {index + 1}
            </Text>
            <Image
              source={{ uri: item }}
              className="w-48 h-64 rounded-lg bg-gray-100 dark:bg-gray-800 mt-1"
              resizeMode="contain"
            />
          </View>
        )}
        ListEmptyComponent={
          <Text className="text-gray-400">No pages added.</Text>
        }
      />
      <View className="w-full flex-row justify-between mt-2 mb-2">
        <Button
          title="Add Another Page"
          onPress={addAnotherPage}
          color="#2563eb"
        />
        <Button
          title={isGenerating ? "Generating..." : "Generate PDF"}
          onPress={generatePDF}
          disabled={isGenerating || images.length === 0}
          color="#22c55e"
        />
      </View>
      {pdfPath && (
        <Button title="Share PDF" onPress={sharePDF} color="#f59e42" />
      )}
    </View>
  );
}

export default PDFExportScreen;
