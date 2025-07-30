import { Colors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Camera, CameraView } from "expo-camera";
import * as FileSystem from "expo-file-system";
import { useRouter } from "expo-router";
import { PDFDocument } from "pdf-lib";
import React, { useRef, useState } from "react";
import { ActivityIndicator, Image, TouchableOpacity, View } from "react-native";
import tw from "twrnc";
import CustomText from "../CustomText";

function getToday() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function CameraScreen() {
  const router = useRouter();
  const cameraRef = useRef(null);
  const [hasPermission, setHasPermission] = useState<null | boolean>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cameraInstanceId, setCameraInstanceId] = useState(0);
  const { actualColorScheme } = useTheme();
  const theme = Colors[actualColorScheme];

  useFocusEffect(
    React.useCallback(() => {
      setPhotoUri(null);
      setIsCameraReady(false);
      setIsLoading(false);
      setSaving(false);
      setCameraInstanceId((id) => id + 1);
    }, [])
  );

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current && isCameraReady) {
      setIsLoading(true);
      // @ts-ignore
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1.0, // Maximum quality
        skipProcessing: true, // Skip any automatic processing
        base64: false,
      });
      setPhotoUri(photo.uri);
      setIsLoading(false);
    }
  };

  const handleSavePDF = async () => {
    if (!photoUri) return;
    setSaving(true);
    try {
      // Copy photo to a permanent location for thumbnail
      const thumbName = `ScanThumb_${Date.now()}.jpg`;
      const thumbUri = FileSystem.documentDirectory + thumbName;
      await FileSystem.copyAsync({ from: photoUri, to: thumbUri });
      // 1. Read image as base64 without compression
      const base64 = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Get image info to preserve original dimensions
      const imageInfo = await FileSystem.getInfoAsync(photoUri);
      console.log("Camera image info:", imageInfo);

      // 2. Create PDF with preserved quality
      const pdfDoc = await PDFDocument.create();
      const jpgImage = await pdfDoc.embedJpg(base64);

      // Create page with exact image dimensions to preserve original size
      const page = pdfDoc.addPage([jpgImage.width, jpgImage.height]);
      page.drawImage(jpgImage, {
        x: 0,
        y: 0,
        width: jpgImage.width,
        height: jpgImage.height,
      });
      // 3. Save PDF to file system without compression
      const pdfBytes = await pdfDoc.save({
        useObjectStreams: false, // Disable object streams to prevent compression
        addDefaultPage: false,
      });

      // Save PDF using a chunked approach to avoid stack overflow
      const chunkSize = 1024; // Process in 1KB chunks
      let binaryString = "";
      for (let i = 0; i < pdfBytes.length; i += chunkSize) {
        const chunk = pdfBytes.slice(
          i,
          Math.min(i + chunkSize, pdfBytes.length)
        );
        for (let j = 0; j < chunk.length; j++) {
          binaryString += String.fromCharCode(chunk[j]);
        }
      }
      const pdfBase64 = btoa(binaryString);

      const fileName = `Scan_${Date.now()}.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;
      // Ensure fileUri has file:// prefix for WebBrowser
      const webFileUri = fileUri.startsWith("file://")
        ? fileUri
        : "file://" + fileUri;
      await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Verify the PDF was saved successfully
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error("Failed to save PDF file");
      }

      // Create the new PDF object
      const newPDF = {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        name: fileName,
        date: getToday(),
        uri: webFileUri,
        thumbUri: thumbUri,
      };

      // Save to AsyncStorage immediately
      try {
        const savedPDFs = await AsyncStorage.getItem("pdfs");
        let pdfs = [];
        if (savedPDFs) {
          pdfs = JSON.parse(savedPDFs);
        }
        const updatedPDFs = [newPDF, ...pdfs];
        await AsyncStorage.setItem("pdfs", JSON.stringify(updatedPDFs));
        console.log("PDF saved to AsyncStorage:", newPDF);
      } catch (error) {
        console.error("Error saving to AsyncStorage:", error);
      }

      // Small delay to ensure file is fully written
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 4. Navigate to PDFs screen, passing new PDF info
      router.push({
        pathname: "/pdfs",
        params: {
          newPDF: JSON.stringify(newPDF),
        },
      });
      setPhotoUri(null);
    } catch (e) {
      const err = e as Error;
      alert("Failed to generate PDF: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View
        style={[
          tw`flex-1 justify-center items-center`,
          { backgroundColor: theme.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <CustomText style={[tw`mt-4`, { color: theme.text }]}>
          Requesting camera permission...
        </CustomText>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View
        style={[
          tw`flex-1 justify-center items-center`,
          { backgroundColor: theme.background },
        ]}
      >
        <CustomText style={{ color: theme.text }}>
          No access to camera
        </CustomText>
      </View>
    );
  }

  if (photoUri) {
    return (
      <View
        style={[
          tw`flex-1 justify-center items-center p-4`,
          { backgroundColor: theme.background },
        ]}
      >
        {/* Header with Back Button */}
        <View
          style={[
            tw`flex-row items-center mb-4 mt-2 w-full`,
            { minHeight: 48 },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`p-2 mr-2`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="arrow-back" size={26} color={theme.primary} />
          </TouchableOpacity>
          <CustomText
            style={[
              tw`text-xl`,
              { color: theme.primary, fontFamily: "Poppins-Bold" },
            ]}
          >
            Camera
          </CustomText>
        </View>
        <View
          style={[
            tw`w-full rounded-2xl mb-6 shadow-lg`,
            {
              backgroundColor: theme.card,
              shadowColor: theme.primary,
              shadowOpacity: 0.08,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
            },
          ]}
        >
          <Image
            source={{ uri: photoUri }}
            style={tw`w-full h-96 rounded-2xl bg-gray-800`}
          />
        </View>
        <View style={tw`flex-row justify-between w-4/5`}>
          <TouchableOpacity
            style={[
              tw`flex-1 mx-2 p-4 rounded-xl items-center shadow-md`,
              { backgroundColor: theme.cardMeme },
            ]}
            onPress={() => setPhotoUri(null)}
            activeOpacity={0.85}
            disabled={saving}
          >
            <MaterialIcons
              name="refresh"
              size={22}
              color="#fff"
              style={tw`mb-1`}
            />
            <CustomText
              style={{
                color: "#fff",
                fontSize: 16,
                fontFamily: "Poppins-SemiBold",
              }}
            >
              Retake
            </CustomText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              tw`flex-1 mx-2 p-4 rounded-xl items-center shadow-md`,
              { backgroundColor: theme.cardImage },
            ]}
            onPress={handleSavePDF}
            activeOpacity={0.85}
            disabled={saving}
          >
            <MaterialIcons
              name="save"
              size={22}
              color="#fff"
              style={tw`mb-1`}
            />
            <CustomText
              style={{
                color: "#fff",
                fontSize: 16,
                fontFamily: "Poppins-SemiBold",
              }}
            >
              {saving ? "Saving..." : "Save"}
            </CustomText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        tw`flex-1 justify-center items-center`,
        { backgroundColor: theme.background },
      ]}
    >
      {/* Header with Back Button */}
      <View
        style={[
          tw`flex-row items-center mt-2 mb-2 w-full z-10`,
          { minHeight: 48, position: "absolute", top: 0, left: 0 },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={tw`p-4`}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="arrow-back" size={26} color="white" />
        </TouchableOpacity>
        <CustomText
          style={[tw`text-xl`, { color: "white", fontFamily: "Poppins-Bold" }]}
        >
          Camera
        </CustomText>
      </View>
      <View
        style={tw`absolute top-0 left-0 w-full h-full items-center justify-center pointer-events-none`}
      >
        {/* Subtle overlay/guide for document scanning */}
        <View
          style={[
            tw`w-4/5 h-2/3 rounded-2xl border-4`,
            { borderColor: theme.primary, opacity: 0.18 },
          ]}
        />
      </View>
      {hasPermission === true && photoUri === null && (
        <CameraView
          key={cameraInstanceId}
          ref={cameraRef}
          style={tw`flex-1 w-full rounded-xl overflow-hidden`}
          facing={"back"}
          onCameraReady={() => setIsCameraReady(true)}
          ratio="16:9"
        />
      )}
      <View style={tw`absolute bottom-20 w-full items-center`}>
        <TouchableOpacity
          style={[
            tw`w-20 h-20 rounded-full justify-center items-center border-4 shadow-lg`,
            {
              backgroundColor: theme.cardSmart,
              borderColor: theme.card,
              shadowColor: theme.primary,
              shadowOpacity: 0.18,
              shadowRadius: 8,
            },
          ]}
          onPress={takePicture}
          disabled={!isCameraReady || isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.text} />
          ) : (
            <MaterialIcons name="camera-alt" size={44} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
