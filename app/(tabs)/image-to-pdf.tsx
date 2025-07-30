import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { PDFDocument } from "pdf-lib";
import React, { useState } from "react";
import { ActivityIndicator, Image, TouchableOpacity, View } from "react-native";
import tw from "twrnc";
import { Colors } from "../../constants/Colors";
import { useTheme } from "../../hooks/useTheme";
import CustomText from "../CustomText";
import { useToast } from "../_layout";

export default function ImageToPDFScreen() {
  const [images, setImages] = useState<string[]>([]); // URIs of selected images
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { actualColorScheme } = useTheme();
  const theme = Colors[actualColorScheme];
  const toast = useToast();

  const handleSelectImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1.0, // Maximum quality
        allowsEditing: false, // Don't allow editing to preserve original size
        exif: true, // Preserve EXIF data for better quality
      });
      if (!result.canceled && result.assets) {
        setImages((prev) => [
          ...prev,
          ...result.assets.map((asset) => asset.uri),
        ]);
      }
    } catch (e) {
      toast.show("Failed to pick images: " + (e as Error).message, "error");
    }
  };

  const handleRemoveImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClearImages = () => {
    setImages([]);
  };

  const handleConvertToPDF = async () => {
    if (images.length === 0) {
      toast.show("Please select images to convert.", "info");
      return;
    }
    setLoading(true);
    let copiedPaths: string[] = [];
    let thumbUri: string | undefined = undefined;
    try {
      const pdfDoc = await PDFDocument.create();
      for (const uri of images) {
        // Read image directly from original source to preserve quality
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Get original image info to preserve dimensions
        const imageInfo = await FileSystem.getInfoAsync(uri);
        console.log("Original image info:", imageInfo);
        if (imageInfo.exists && "size" in imageInfo) {
          console.log("Original image size:", imageInfo.size, "bytes");
        }

        // Try to embed as JPG, fallback to PNG - preserve original format
        let img, dims;
        try {
          img = await pdfDoc.embedJpg(base64);
          dims = { width: img.width, height: img.height };
          console.log("Embedded as JPG with dimensions:", dims);
        } catch (error) {
          console.log("JPG embedding failed, trying PNG:", error);
          img = await pdfDoc.embedPng(base64);
          dims = { width: img.width, height: img.height };
          console.log("Embedded as PNG with dimensions:", dims);
        }

        // Create page with exact image dimensions to preserve original size
        const page = pdfDoc.addPage([dims.width, dims.height]);
        page.drawImage(img, {
          x: 0,
          y: 0,
          width: dims.width,
          height: dims.height,
        });

        // Save the first image as the thumbnail (copy only for thumbnail)
        if (!thumbUri) {
          const thumbName = `ImagePDFThumb_${Date.now()}.jpg`;
          thumbUri = FileSystem.documentDirectory + thumbName;
          await FileSystem.copyAsync({ from: uri, to: thumbUri });
        }
      }
      const pdfBytes = await pdfDoc.save({
        useObjectStreams: false, // Disable object streams to prevent compression
        addDefaultPage: false,
      });
      const fileName = `ImagePDF_${Date.now()}.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;

      // Save PDF using proper binary encoding
      let base64String;
      if (typeof Buffer !== "undefined") {
        base64String = Buffer.from(pdfBytes).toString("base64");
      } else {
        // Fallback for environments without Buffer
        const binaryString = Array.from(pdfBytes, (byte) =>
          String.fromCharCode(byte)
        ).join("");
        base64String = btoa(binaryString);
      }
      await FileSystem.writeAsStringAsync(fileUri, base64String, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Debug: Check file existence and size
      const info = await FileSystem.getInfoAsync(fileUri);
      console.log("PDF file saved at:", fileUri, "Exists:", info.exists);
      if (info.exists && "size" in info) {
        console.log("Final PDF size:", info.size, "bytes");
        console.log("PDF size in KB:", (info.size / 1024).toFixed(2), "KB");
      }
      console.log("PDF bytes length:", pdfBytes.length);
      // Add to AsyncStorage PDF list
      const newPDF = {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        name: fileName,
        date: new Date().toISOString().slice(0, 10),
        uri: fileUri.startsWith("file://") ? fileUri : "file://" + fileUri,
        thumbUri: thumbUri
          ? thumbUri.startsWith("file://")
            ? thumbUri
            : "file://" + thumbUri
          : undefined,
      };
      // Save to AsyncStorage with better error handling
      try {
        const saved = await AsyncStorage.getItem("pdfs");
        let pdfs = [];
        if (saved) {
          pdfs = JSON.parse(saved);
          console.log("Loaded existing PDFs from AsyncStorage:", pdfs.length);
        }

        // Check if PDF already exists to avoid duplicates
        const exists = pdfs.find((pdf: any) => pdf.id === newPDF.id);
        if (exists) {
          console.log(
            "PDF already exists in AsyncStorage, not adding duplicate"
          );
        } else {
      const updatedPDFs = [newPDF, ...pdfs];
      await AsyncStorage.setItem("pdfs", JSON.stringify(updatedPDFs));
          console.log(
            "Successfully saved new PDF to AsyncStorage. Total PDFs:",
            updatedPDFs.length
          );
        }
      } catch (error) {
        console.error("Error saving to AsyncStorage:", error);
        // Try to save just the new PDF if there's an error
        try {
          await AsyncStorage.setItem("pdfs", JSON.stringify([newPDF]));
          console.log("Saved only new PDF to AsyncStorage due to error");
        } catch (fallbackError) {
          console.error(
            "Failed to save PDF even in fallback mode:",
            fallbackError
          );
        }
      }
      toast.show("PDF created and added to your list!", "success");
      setImages([]);
    } catch (e) {
      toast.show("Failed to convert images: " + (e as Error).message, "error");
      console.log("Error during PDF creation:", e);
    } finally {
      // Clean up any temporary files if needed
      if (copiedPaths.length > 0) {
      for (const path of copiedPaths) {
        try {
          await FileSystem.deleteAsync(path, { idempotent: true });
        } catch {}
        }
      }
      setLoading(false);
    }
  };

  return (
    <View
      style={[tw`flex-1 px-4 pt-8 pb-6`, { backgroundColor: theme.background }]}
    >
      {/* Header with Back Button */}
      <View style={[tw`flex-row items-center mb-4`, { minHeight: 48 }]}>
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
          Image to PDF
        </CustomText>
      </View>
      {/* Step Header */}
      <CustomText
        style={[tw`mb-2 text-base text-center`, { color: theme.primary }]}
      >
        Step 1: Select Images → Step 2: Convert to PDF
      </CustomText>
      {/* Tips */}
      <CustomText
        style={[tw`mb-4 text-center text-sm`, { color: theme.muted }]}
      >
        Tip: You can select multiple images. Tap an image to remove it. Use
        &apos;Clear All&apos; to start over.
      </CustomText>
      {/* Select Images Button */}
      <TouchableOpacity
        style={[
          tw`mb-3 p-4 rounded-xl items-center border`,
          { backgroundColor: theme.card, borderColor: theme.primary },
        ]}
        onPress={handleSelectImages}
        activeOpacity={0.85}
        disabled={loading}
      >
        <MaterialIcons
          name="add-photo-alternate"
          size={26}
          color={theme.primary}
        />
        <CustomText
          style={[
            tw`mt-1 font-semibold`,
            { color: theme.primary, fontFamily: "Poppins-SemiBold" },
          ]}
        >
          Select Images
        </CustomText>
      </TouchableOpacity>
      {/* Clear All Button */}
      {images.length > 0 && (
        <TouchableOpacity
          style={[
            tw`mb-2 p-2 rounded items-center self-end`,
            {
              backgroundColor: theme.card,
              borderColor: theme.muted,
              borderWidth: 1,
            },
          ]}
          onPress={handleClearImages}
          disabled={loading}
        >
          <CustomText
            style={[
              tw`text-xs`,
              { color: theme.muted, fontFamily: "Poppins-Regular" },
            ]}
          >
            Clear All
          </CustomText>
        </TouchableOpacity>
      )}
      {/* Image Grid Preview */}
      {images.length === 0 ? (
        <CustomText style={[tw`text-center mt-8`, { color: theme.muted }]}>
          No images selected.
        </CustomText>
      ) : (
        <View style={tw`flex-row flex-wrap justify-center mb-4`}>
          {images.map((uri, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => handleRemoveImage(idx)}
              disabled={loading}
              style={tw`m-1`}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri }}
                style={tw`w-20 h-20 rounded-lg bg-gray-200`}
                resizeMode="cover"
              />
              <View
                style={[
                  tw`absolute top-0 right-0 bg-red-500 rounded-full`,
                  { padding: 2 },
                ]}
              >
                <MaterialIcons name="close" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {/* Convert Button */}
      <TouchableOpacity
        style={[
          tw`mt-4 p-4 rounded-xl items-center`,
          {
            backgroundColor:
              images.length === 0 || loading
                ? theme.cardHashtag
                : theme.cardHashtag,
          },
        ]}
        onPress={handleConvertToPDF}
        activeOpacity={0.85}
        disabled={images.length === 0 || loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.icon} />
        ) : (
          <>
            <MaterialIcons name="picture-as-pdf" size={24} color={theme.icon} />
            <CustomText
              style={[
                tw`mt-1 font-semibold`,
                { color: theme.icon, fontFamily: "Poppins-SemiBold" },
              ]}
            >
              Convert to PDF
            </CustomText>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}
