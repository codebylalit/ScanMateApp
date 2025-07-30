import { useTheme } from "@/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as FileSystem from "expo-file-system";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  TouchableOpacity,
  View,
} from "react-native";
import tw from "twrnc";
import { Colors } from "../../constants/Colors";
import CustomText from "../CustomText";
import { useToast } from "../_layout";

// Type for a PDF item
// (copy from pdfs.tsx for type safety)
type PDFItem = {
  id: string;
  name: string;
  date: string;
  uri?: string;
  thumbUri?: string;
};

const PDFCO_API_KEY =
  "lalitgaming55@gmail.com_xRjlBq6tZ4dQd6agsvNtuVkAnpQvpDsVJDzqsd8FICBBwtfCDFLBPProAnzTCqui";

async function compressPdfWithPDFco(
  localPdfUri: string,
  quality: "low" | "medium" | "high" = "medium"
): Promise<string | null> {
  try {
    console.log("Starting PDF.co compression for:", localPdfUri);

    // First, upload the file to PDF.co to get a URL
    const fileName = localPdfUri.split("/").pop() || "file.pdf";
    const uploadFormData = new FormData();
    uploadFormData.append("file", {
      uri: localPdfUri,
      name: fileName,
      type: "application/pdf",
    } as any);

    console.log("Uploading file to PDF.co...");
    const uploadResponse = await axios.post(
      "https://api.pdf.co/v1/file/upload",
      uploadFormData,
      {
        headers: {
          "x-api-key": PDFCO_API_KEY,
          "Content-Type": "multipart/form-data",
        },
      }
    );

    if (!uploadResponse.data || !uploadResponse.data.url) {
      throw new Error("Failed to upload file to PDF.co");
    }

    const uploadedFileUrl = uploadResponse.data.url;
    console.log("File uploaded successfully, URL:", uploadedFileUrl);

    // Now compress the PDF using the new v2 API
    console.log("Starting PDF compression with v2 API...");
    const compressResponse = await axios.post(
      "https://api.pdf.co/v2/pdf/compress",
      {
        url: uploadedFileUrl,
        async: false,
        config: {
          images: {
            color: {
              skip: false,
              downsample: {
                skip: false,
                downsample_ppi: 150,
                threshold_ppi: 225,
              },
              compression: {
                skip: false,
                compression_format: "jpeg",
                compression_params: {
                  quality:
                    quality === "low" ? 30 : quality === "medium" ? 60 : 80,
                },
              },
            },
            grayscale: {
              skip: false,
              downsample: {
                skip: false,
                downsample_ppi: 150,
                threshold_ppi: 225,
              },
              compression: {
                skip: false,
                compression_format: "jpeg",
                compression_params: {
                  quality:
                    quality === "low" ? 30 : quality === "medium" ? 60 : 80,
                },
              },
            },
            monochrome: {
              skip: false,
              downsample: {
                skip: false,
                downsample_ppi: 300,
                threshold_ppi: 450,
              },
              compression: {
                skip: false,
                compression_format: "ccitt_g4",
                compression_params: {},
              },
            },
          },
          save: {
            garbage: 4,
          },
        },
      },
      {
        headers: {
          "x-api-key": PDFCO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("PDF.co compression response:", compressResponse.data);

    if (compressResponse.data && compressResponse.data.url) {
      console.log(
        "Compression successful, download URL:",
        compressResponse.data.url
      );
      return compressResponse.data.url;
    } else {
      throw new Error("No download URL returned from PDF.co compression");
    }
  } catch (e: any) {
    console.log(
      "PDF.co compression error:",
      e.response ? e.response.data : e.message
    );
    Alert.alert(
      "PDF.co Compression Error",
      e.response ? JSON.stringify(e.response.data) : e.message
    );
    return null;
  }
}

export default function CompressPDFScreen() {
  const [pdfs, setPDFs] = useState<PDFItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [compressingId, setCompressingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [selectedPDF, setSelectedPDF] = useState<PDFItem | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsSize, setDetailsSize] = useState<number | null>(null);
  const [qualityModalVisible, setQualityModalVisible] = useState(false);
  const [pdfToCompress, setPdfToCompress] = useState<PDFItem | null>(null);
  const { actualColorScheme } = useTheme();
  const theme = Colors[actualColorScheme];
  const router = useRouter();
  const [compressionQuality, setCompressionQuality] = useState<
    "low" | "medium" | "high"
  >("medium");
  const toast = useToast();

  // Function to load PDFs from AsyncStorage
  const loadPDFs = useCallback(async () => {
    setLoading(true);
    try {
      const saved = await AsyncStorage.getItem("pdfs");
      if (saved) {
        setPDFs(JSON.parse(saved));
      } else {
        setPDFs([]);
      }
    } catch (error) {
      console.error("Error loading PDFs:", error);
      setPDFs([]);
    }
    setLoading(false);
  }, []);

  // Load PDFs from AsyncStorage on mount
  useEffect(() => {
    loadPDFs();
  }, [loadPDFs]);

  // Reload PDFs when screen comes into focus (e.g., when returning from settings)
  useFocusEffect(
    useCallback(() => {
      loadPDFs();
    }, [loadPDFs])
  );

  const handleDownload = async (pdf: PDFItem) => {
    if (!pdf.uri) return;
    try {
      let destDir = FileSystem.documentDirectory;
      let destName = pdf.name;
      if (Platform.OS === "android") {
        // @ts-ignore
        destDir =
          (FileSystem as any).downloadsDirectory ||
          FileSystem.cacheDirectory ||
          FileSystem.documentDirectory;
        if (!destDir) {
          Alert.alert(
            "Error",
            "No downloads directory available on this device."
          );
          return;
        }
      }
      const destUri = destDir + destName;
      await FileSystem.copyAsync({ from: pdf.uri, to: destUri });
      toast.show(`PDF saved to: ${destUri}`, "success");
    } catch {
      toast.show("Could not save PDF to device.", "error");
    }
  };

  const handleDelete = (pdf: PDFItem) => {
    Alert.alert(
      "Delete PDF",
      `Are you sure you want to delete "${pdf.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setPDFs((prev) => prev.filter((item) => item.id !== pdf.id));
            if (pdf.uri) {
              FileSystem.deleteAsync(pdf.uri, { idempotent: true }).catch(
                () => {}
              );
            }
            setDetailsVisible(false);
          },
        },
      ]
    );
  };

  const openDetails = async (pdf: PDFItem) => {
    setSelectedPDF(pdf);
    setDetailsVisible(true);
    if (pdf.uri) {
      try {
        const info = await FileSystem.getInfoAsync(pdf.uri);
        setDetailsSize(
          info.exists && "size" in info && typeof info.size === "number"
            ? info.size
            : null
        );
      } catch {
        setDetailsSize(null);
      }
    } else {
      setDetailsSize(null);
    }
  };

  const handleCompress = async (pdf: PDFItem) => {
    if (!pdf.uri) return;
    setCompressingId(pdf.id);
    setProgress("Starting compression...");
    try {
      setProgress("Uploading PDF to PDF.co...");
      const downloadUrl = await compressPdfWithPDFco(
        pdf.uri,
        compressionQuality
      );
      if (!downloadUrl) {
        setCompressingId(null);
        setProgress(null);
        return;
      }
      setProgress("Downloading compressed PDF...");
      const localCompressedUri =
        FileSystem.documentDirectory + "Compressed_" + Date.now() + ".pdf";
      await FileSystem.downloadAsync(downloadUrl, localCompressedUri);
      const compressedUri = localCompressedUri;

      if (!compressedUri) {
        setCompressingId(null);
        setProgress(null);
        return;
      }
      setProgress("Saving compressed PDF...");
      // Get file size
      const info = await FileSystem.getInfoAsync(compressedUri);
      // Add to list
      const fileName = compressedUri.split("/").pop() || "Compressed.pdf";
      const newPDF: PDFItem = {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        name: fileName,
        date: new Date().toISOString().slice(0, 10),
        uri: compressedUri,
        thumbUri: pdf.thumbUri,
      };
      const updatedPDFs = [newPDF, ...pdfs];
      setPDFs(updatedPDFs);
      await AsyncStorage.setItem("pdfs", JSON.stringify(updatedPDFs));
      setCompressingId(null);
      setProgress(null);
      toast.show(
        `Compressed PDF saved! Size: ${
          info.exists && "size" in info && typeof info.size === "number"
            ? (info.size / 1024).toFixed(1)
            : "?"
        } KB`,
        "success"
      );
    } catch (e) {
      setCompressingId(null);
      setProgress(null);
      toast.show("Failed to compress PDF: " + (e as Error).message, "error");
    }
  };

  // Helper: base64 to Uint8Array
  function base64ToUint8Array(base64: string): Uint8Array {
    if (typeof Buffer !== "undefined") {
      return Uint8Array.from(Buffer.from(base64, "base64"));
    }
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  return (
    <View
      style={[tw`flex-1 px-4 pt-8 pb-6`, { backgroundColor: theme.background }]}
    >
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
          Compress PDF
        </CustomText>
      </View>

      {loading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color={theme.primary} />
          <CustomText
            style={[tw`mt-4 text-lg font-semibold`, { color: theme.muted }]}
          >
            Loading PDFs...
          </CustomText>
        </View>
      ) : pdfs.length === 0 ? (
        <View style={tw`flex-1 items-center justify-center mt-8`}>
          <MaterialIcons name="picture-as-pdf" size={64} color={theme.muted} />
          <CustomText
            style={[
              tw`text-center mt-4 text-lg font-semibold`,
              { color: theme.muted },
            ]}
          >
            No PDFs found
          </CustomText>
          <CustomText
            style={[tw`text-center mt-2 text-base`, { color: theme.muted }]}
          >
            Start scanning or importing to see your documents here.
          </CustomText>
        </View>
      ) : (
        <FlatList
          data={pdfs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => openDetails(item)}
              disabled={!!compressingId}
              activeOpacity={0.85}
              style={[
                tw`mb-4 rounded-2xl p-5 flex-row items-center shadow-lg`,
                {
                  backgroundColor: theme.cardSmart,
                  shadowColor: theme.primary,
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  opacity: compressingId && compressingId !== item.id ? 0.5 : 1,
                },
              ]}
            >
              {item.thumbUri ? (
                <Image
                  source={{ uri: item.thumbUri }}
                  style={tw`w-15 h-15 rounded-lg bg-gray-200`}
                  resizeMode="cover"
                />
              ) : (
                <MaterialIcons
                  name="picture-as-pdf"
                  size={52}
                  color={theme.primary}
                  style={tw`bg-gray-200 rounded-lg p-2`}
                />
              )}
              <View style={[tw`flex-1 justify-center ml-2`, { minWidth: 0 }]}>
                <CustomText
                  style={[tw`text-base font-semibold`, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {item.name}
                </CustomText>
                <CustomText
                  style={[tw`text-xs opacity-70`, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {item.date}
                </CustomText>
              </View>
              <View style={tw`ml-4`}>
                {compressingId === item.id ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <MaterialIcons
                    name="more-vert"
                    size={24}
                    color={theme.primary}
                  />
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
      {progress && (
        <View style={tw`mb-4 items-center justify-center`}>
          <CustomText style={[tw`text-base`, { color: theme.primary }]}>
            {progress}
          </CustomText>
        </View>
      )}

      {/* PDF Details Modal */}
      <Modal
        visible={detailsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "#0008",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setDetailsVisible(false)}
        >
          <View
            style={[
              tw`rounded-2xl p-6`,
              { backgroundColor: theme.card, minWidth: 280, maxWidth: 340 },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {/* Close Button */}
            <TouchableOpacity
              style={[
                tw`absolute top-4 right-4 p-1 rounded-full`,
                { backgroundColor: theme.muted },
              ]}
              onPress={() => setDetailsVisible(false)}
            >
              <MaterialIcons name="close" size={20} color={theme.background} />
            </TouchableOpacity>

            <CustomText
              style={[tw`text-lg font-bold mb-3`, { color: theme.text }]}
            >
              PDF Details
            </CustomText>
            <View style={[tw`mb-4`, { gap: 8 }]}>
              <View style={tw`flex-row items-center`}>
                <MaterialIcons
                  name="description"
                  size={18}
                  color={theme.primary}
                  style={tw`mr-2`}
                />
                <View style={tw`flex-1`}>
                  <CustomText
                    style={[tw`text-xs font-medium`, { color: theme.muted }]}
                  >
                    Name
                  </CustomText>
                  <CustomText
                    style={[tw`text-sm`, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {selectedPDF?.name}
                  </CustomText>
                </View>
              </View>

              <View style={tw`flex-row items-center`}>
                <MaterialIcons
                  name="schedule"
                  size={18}
                  color={theme.primary}
                  style={tw`mr-2`}
                />
                <View style={tw`flex-1`}>
                  <CustomText
                    style={[tw`text-xs font-medium`, { color: theme.muted }]}
                  >
                    Date
                  </CustomText>
                  <CustomText style={[tw`text-sm`, { color: theme.text }]}>
                    {selectedPDF?.date}
                  </CustomText>
                </View>
              </View>

              <View style={tw`flex-row items-center`}>
                <MaterialIcons
                  name="storage"
                  size={18}
                  color={theme.primary}
                  style={tw`mr-2`}
                />
                <View style={tw`flex-1`}>
                  <CustomText
                    style={[tw`text-xs font-medium`, { color: theme.muted }]}
                  >
                    Size
                  </CustomText>
                  <CustomText style={[tw`text-sm`, { color: theme.text }]}>
                    {detailsSize !== null
                      ? `${(detailsSize / 1024).toFixed(1)} KB`
                      : "Unknown"}
                  </CustomText>
                </View>
              </View>
            </View>

            {/* Action Buttons - Redesigned */}
            <View style={[tw`mb-3`]}>
              {/* Compress Button with Inline Actions */}
              <View style={[tw`flex-row items-center`, { gap: 8 }]}>
                {/* Compress Button */}
                <TouchableOpacity
                  style={[
                    tw`flex-1 p-3 rounded-lg`,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={() => {
                    setDetailsVisible(false);
                    if (selectedPDF) {
                      setPdfToCompress(selectedPDF);
                      setQualityModalVisible(true);
                    }
                  }}
                >
                  <View style={tw`flex-row items-center justify-center`}>
                    <MaterialIcons
                      name="compress"
                      size={20}
                      color={theme.background}
                      style={tw`mr-2`}
                    />
                    <CustomText
                      style={{
                        color: theme.background,
                        fontWeight: "bold",
                        fontSize: 14,
                      }}
                    >
                      Compress
                    </CustomText>
                  </View>
                </TouchableOpacity>

                {/* Download Icon */}
                <TouchableOpacity
                  style={[
                    tw`p-3 rounded-lg border`,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.muted,
                    },
                  ]}
                  onPress={() => {
                    setDetailsVisible(false);
                    if (selectedPDF) handleDownload(selectedPDF);
                  }}
                >
                  <MaterialIcons name="download" size={20} color={theme.text} />
                </TouchableOpacity>

                {/* Delete Icon */}
                <TouchableOpacity
                  style={[
                    tw`p-3 rounded-lg border`,
                    {
                      backgroundColor: theme.card,
                      borderColor: "#ef4444",
                    },
                  ]}
                  onPress={() => {
                    if (selectedPDF) handleDelete(selectedPDF);
                  }}
                >
                  <MaterialIcons name="delete" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Compression Quality Selection Modal */}
      <Modal
        visible={qualityModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQualityModalVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "#0008",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setQualityModalVisible(false)}
        >
          <View
            style={[
              tw`rounded-2xl p-6`,
              { backgroundColor: theme.card, minWidth: 280, maxWidth: 340 },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <CustomText
              style={[
                tw`text-lg font-bold mb-3 text-center`,
                { color: theme.text },
              ]}
            >
              Select Compression Quality
            </CustomText>

            <CustomText
              style={[tw`text-sm mb-4 text-center`, { color: theme.muted }]}
            >
              Choose the compression level for &quot;{pdfToCompress?.name}&quot;
            </CustomText>

            {/* Quality Options */}
            <View style={[tw`mb-4`, { gap: 12 }]}>
              <TouchableOpacity
                style={[
                  tw`p-4 rounded-lg border-2`,
                  {
                    backgroundColor:
                      compressionQuality === "low" ? theme.primary : theme.card,
                    borderColor:
                      compressionQuality === "low"
                        ? theme.primary
                        : theme.muted,
                  },
                ]}
                onPress={() => setCompressionQuality("low")}
              >
                <View style={tw`flex-row items-center justify-between`}>
                  <View>
                    <CustomText
                      style={{
                        color:
                          compressionQuality === "low"
                            ? theme.background
                            : theme.text,
                        fontWeight: "bold",
                        fontSize: 14,
                      }}
                    >
                      Low Compression
                    </CustomText>
                    <CustomText
                      style={{
                        color:
                          compressionQuality === "low"
                            ? theme.background
                            : theme.muted,
                        fontSize: 11,
                      }}
                    >
                      Smallest file size, lower quality
                    </CustomText>
                  </View>
                  <MaterialIcons
                    name={
                      compressionQuality === "low"
                        ? "check-circle"
                        : "radio-button-unchecked"
                    }
                    size={20}
                    color={
                      compressionQuality === "low"
                        ? theme.background
                        : theme.muted
                    }
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  tw`p-4 rounded-lg border-2`,
                  {
                    backgroundColor:
                      compressionQuality === "medium"
                        ? theme.primary
                        : theme.card,
                    borderColor:
                      compressionQuality === "medium"
                        ? theme.primary
                        : theme.muted,
                  },
                ]}
                onPress={() => setCompressionQuality("medium")}
              >
                <View style={tw`flex-row items-center justify-between`}>
                  <View>
                    <CustomText
                      style={{
                        color:
                          compressionQuality === "medium"
                            ? theme.background
                            : theme.text,
                        fontWeight: "bold",
                        fontSize: 14,
                      }}
                    >
                      Medium Compression
                    </CustomText>
                    <CustomText
                      style={{
                        color:
                          compressionQuality === "medium"
                            ? theme.background
                            : theme.muted,
                        fontSize: 11,
                      }}
                    >
                      Balanced size and quality
                    </CustomText>
                  </View>
                  <MaterialIcons
                    name={
                      compressionQuality === "medium"
                        ? "check-circle"
                        : "radio-button-unchecked"
                    }
                    size={20}
                    color={
                      compressionQuality === "medium"
                        ? theme.background
                        : theme.muted
                    }
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  tw`p-4 rounded-lg border-2`,
                  {
                    backgroundColor:
                      compressionQuality === "high"
                        ? theme.primary
                        : theme.card,
                    borderColor:
                      compressionQuality === "high"
                        ? theme.primary
                        : theme.muted,
                  },
                ]}
                onPress={() => setCompressionQuality("high")}
              >
                <View style={tw`flex-row items-center justify-between`}>
                  <View>
                    <CustomText
                      style={{
                        color:
                          compressionQuality === "high"
                            ? theme.background
                            : theme.text,
                        fontWeight: "bold",
                        fontSize: 14,
                      }}
                    >
                      High Compression
                    </CustomText>
                    <CustomText
                      style={{
                        color:
                          compressionQuality === "high"
                            ? theme.background
                            : theme.muted,
                        fontSize: 11,
                      }}
                    >
                      Best quality, larger file size
                    </CustomText>
                  </View>
                  <MaterialIcons
                    name={
                      compressionQuality === "high"
                        ? "check-circle"
                        : "radio-button-unchecked"
                    }
                    size={20}
                    color={
                      compressionQuality === "high"
                        ? theme.background
                        : theme.muted
                    }
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={[tw`flex-row justify-center`, { gap: 12 }]}>
              <TouchableOpacity
                style={[
                  tw`px-4 py-2 rounded-lg flex-1 mx-1`,
                  { backgroundColor: theme.muted },
                ]}
                onPress={() => setQualityModalVisible(false)}
              >
                <CustomText
                  style={{
                    color: theme.background,
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  Cancel
                </CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  tw`px-4 py-2 rounded-lg flex-1 mx-1`,
                  { backgroundColor: theme.primary },
                ]}
                onPress={() => {
                  setQualityModalVisible(false);
                  if (pdfToCompress) {
                    handleCompress(pdfToCompress);
                  }
                }}
              >
                <CustomText
                  style={{
                    color: theme.background,
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  Compress
                </CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
