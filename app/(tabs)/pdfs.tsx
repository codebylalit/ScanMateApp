import { Colors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { useFonts } from "expo-font";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import tw from "twrnc";
import CustomText from "../CustomText";
import { useLoadingOverlay } from "../_layout";

// Type for a PDF item
type PDFItem = {
  id: string;
  name: string;
  date: string;
  uri?: string;
  thumbUri?: string;
};

const initialPDFs: PDFItem[] = [];

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

// Helper: Format PDF display name
function formatPDFDisplayName(name: string): string {
  // Remove .pdf extension and clean up the name
  const cleanName = name.replace(/\.pdf$/i, "").trim();

  // If the name is empty or contains only special characters, return default
  if (!cleanName || /^[^\w\s]+$/.test(cleanName)) {
    return "Untitled Document";
  }

  // Capitalize first letter of each word
  return cleanName
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export default function PDFsScreen() {
  const [fontsLoaded] = useFonts({
    "Poppins-Regular": require("../../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-Bold": require("../../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-SemiBold": require("../../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Black": require("../../assets/fonts/Poppins-Black.ttf"),
    "Poppins-Light": require("../../assets/fonts/Poppins-Light.ttf"),
    "Poppins-ExtraBold": require("../../assets/fonts/Poppins-ExtraBold.ttf"),
  });
  const [pdfs, setPDFs] = useState<PDFItem[]>(initialPDFs);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const { actualColorScheme, isLoading: themeLoading } = useTheme();
  const theme = Colors[actualColorScheme];
  const params = useLocalSearchParams();
  const router = useRouter();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [detailsPDF, setDetailsPDF] = useState<PDFItem | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsSize, setDetailsSize] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { show, hide } = useLoadingOverlay();

  // Block rendering until fonts and theme are fully loaded
  if (!fontsLoaded || themeLoading || !theme) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#888" />
      </View>
    );
  }

  // Function to load PDFs from AsyncStorage
  const loadPDFs = useCallback(async () => {
    setLoading(true);
    try {
      const saved = await AsyncStorage.getItem("pdfs");
      console.log("Loaded PDFs from AsyncStorage:", saved);
      if (saved) {
        const parsedPDFs = JSON.parse(saved);
        console.log("Parsed PDFs count:", parsedPDFs.length);
        setPDFs(parsedPDFs);
      } else {
        console.log("No PDFs found in AsyncStorage");
        setPDFs([]);
      }
    } catch (error) {
      console.error("Error loading PDFs:", error);
      // Don't set empty array on error to prevent clearing existing data
      // Only set empty if we're sure there's no data
      const saved = await AsyncStorage.getItem("pdfs");
      if (!saved) {
        setPDFs([]);
      }
    }
    setLoading(false);
    setIsInitialLoad(false);
    setHasLoadedOnce(true);
  }, []);

  // Function to save PDFs to AsyncStorage
  const savePDFs = useCallback(async (pdfsToSave: PDFItem[]) => {
    try {
      await AsyncStorage.setItem("pdfs", JSON.stringify(pdfsToSave));
      console.log("Saved PDFs to AsyncStorage:", pdfsToSave);
    } catch (error) {
      console.error("Error saving PDFs to AsyncStorage:", error);
    }
  }, []);

  // Function to handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPDFs();
    setRefreshing(false);
  }, [loadPDFs]);

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

  // Save PDFs to AsyncStorage whenever they change (but not during initial load)
  useEffect(() => {
    if (!isInitialLoad && hasLoadedOnce) {
      const savePDFs = async () => {
        try {
          await AsyncStorage.setItem("pdfs", JSON.stringify(pdfs));
          console.log("Saved PDFs to AsyncStorage (on change):", pdfs);
        } catch (error) {
          console.error("Error saving PDFs to AsyncStorage:", error);
        }
      };
      savePDFs();
    }
  }, [pdfs, isInitialLoad, hasLoadedOnce]);

  useEffect(() => {
    if (params.newPDF) {
      try {
        const newPDF = JSON.parse(params.newPDF as string);
        console.log("Received newPDF from params:", newPDF);

        // Check if PDF already exists to avoid duplicates
        setPDFs((prev) => {
          const exists = prev.find((pdf) => pdf.id === newPDF.id);
          if (exists) {
            console.log("PDF already exists, not adding duplicate");
            return prev;
          }
          console.log("Adding new PDF to list:", newPDF);
          return [newPDF, ...prev];
        });

        // Clear the parameter to prevent re-adding on re-render
        router.setParams({ newPDF: undefined });
      } catch (e) {
        console.error("Error parsing newPDF param:", e);
      }
    }
  }, [params.newPDF, router]);

  const handleOpen = async (pdf: PDFItem) => {
    if (pdf.uri) {
      try {
        // Use FileSystem.getContentUriAsync for Android, else use file:// URI
        let uri = pdf.uri;
        if (Platform.OS === "android") {
          uri = await FileSystem.getContentUriAsync(
            pdf.uri.replace("file://", "")
          );
        }
        await WebBrowser.openBrowserAsync(uri);
      } catch {
        // Removed alert for 'Could not open PDF.'
      }
    } else {
      Alert.alert("Open PDF", `Would open: ${pdf.name}`);
    }
  };

  const handleDelete = async (pdf: PDFItem) => {
    try {
      // Update state first
      const updatedPDFs = pdfs.filter((item) => item.id !== pdf.id);
      setPDFs(updatedPDFs);

      // Save to AsyncStorage immediately using the save function
      await savePDFs(updatedPDFs);
      console.log("PDF deleted and AsyncStorage updated");

      // Delete the actual file
      if (pdf.uri) {
        try {
          await FileSystem.deleteAsync(pdf.uri, { idempotent: true });
          console.log("PDF file deleted from filesystem");
        } catch (fileError) {
          console.error("Error deleting PDF file:", fileError);
        }
      }
    } catch (error) {
      console.error("Error in handleDelete:", error);
      // Reload PDFs if there was an error
      loadPDFs();
    }
  };

  const handleSaveToDevice = async (pdf: PDFItem) => {
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
      Alert.alert("Saved", `PDF saved to: ${destUri}`);
    } catch {
      Alert.alert("Error", "Could not save PDF to device.");
    }
  };

  const handleShare = async (pdf: PDFItem) => {
    if (!pdf.uri) return;
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdf.uri);
      } else {
        Alert.alert(
          "Sharing not available",
          "This device does not support sharing files."
        );
      }
    } catch {
      Alert.alert("Error", "Could not share PDF.");
    }
  };

  const handleRename = (pdf: PDFItem) => {
    setRenamingId(pdf.id);
    setRenameValue(pdf.name.replace(/\.pdf$/i, ""));
  };
  const handleRenameSubmit = async (pdf: PDFItem) => {
    const newName = renameValue.trim();
    if (!newName) {
      Alert.alert("Invalid Name", "Name cannot be empty.");
      return;
    }
    // Clean up the name to prevent weird characters
    const cleanName = newName.replace(/[^\w\s-]/g, "").trim();
    if (!cleanName) {
      Alert.alert("Invalid Name", "Name contains invalid characters.");
      return;
    }
    const updatedName = cleanName.endsWith(".pdf")
      ? cleanName
      : cleanName + ".pdf";
    const updatedPDFs = pdfs.map((item) =>
      item.id === pdf.id ? { ...item, name: updatedName } : item
    );
    setPDFs(updatedPDFs);
    await savePDFs(updatedPDFs);
    setRenamingId(null);
  };

  // Add a function to open details modal and get file size
  const openDetails = async (pdf: PDFItem) => {
    setDetailsPDF(pdf);
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

  return (
    <View
      style={[
        tw`flex-1 px-4 pt-8 pb-6`,
        { backgroundColor: theme.background || "#fff" }, // fallback color
      ]}
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
          All PDFs
        </CustomText>
      </View>
      {/* PDF List or Loading/Empty State */}
      {loading ? (
        <View style={tw`flex-1 items-center justify-center`}>
          <View
            style={[
              tw`w-20 h-20 rounded-full items-center justify-center mb-4`,
              { backgroundColor: theme.primary + "15" },
            ]}
          >
            <MaterialIcons
              name="picture-as-pdf"
              size={40}
              color={theme.primary}
            />
          </View>
          <CustomText
            style={[tw`text-lg font-semibold`, { color: theme.text }]}
          >
            Loading PDFs...
          </CustomText>
        </View>
      ) : pdfs.length === 0 ? (
        <View style={tw`flex-1 items-center justify-center mt-8 px-8`}>
          <View
            style={[
              tw`w-24 h-24 rounded-full items-center justify-center mb-6`,
              { backgroundColor: theme.primary + "15" },
            ]}
          >
            <MaterialIcons
              name="picture-as-pdf"
              size={48}
              color={theme.primary}
            />
          </View>
          <CustomText
            style={[
              tw`text-center text-xl font-bold mb-2`,
              { color: theme.text },
            ]}
          >
            No PDFs yet
          </CustomText>
          <CustomText
            style={[
              tw`text-center text-base leading-6`,
              { color: theme.muted },
            ]}
          >
            Start scanning documents or import images to create your first PDF
          </CustomText>
        </View>
      ) : (
        <FlatList
          data={pdfs}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          contentContainerStyle={
            pdfs.length === 0 ? tw`flex-1 justify-center` : undefined
          }
          renderItem={({ item, index }) => {
            return (
              <View style={tw`relative`}>
                <TouchableOpacity
                  onLongPress={() => handleRename(item)}
                  onPress={() => openDetails(item)}
                  activeOpacity={0.85}
                  style={[
                    tw`mb-4 rounded-2xl p-5 flex-row items-center shadow-lg`,
                    {
                      backgroundColor: theme.cardSmart,
                      shadowColor: theme.primary,
                      shadowOpacity: 0.1,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: 8,
                    },
                  ]}
                >
                  {/* Thumbnail or Icon */}
                  <View
                    style={tw`w-16 h-16 rounded-xl overflow-hidden items-center justify-center`}
                  >
                    {item.thumbUri ? (
                      <Image
                        source={{ uri: item.thumbUri }}
                        style={tw`w-full h-full`}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          tw`w-full h-full items-center justify-center`,
                          { backgroundColor: theme.primary + "15" },
                        ]}
                      >
                        <MaterialIcons
                          name="picture-as-pdf"
                          size={32}
                          color={theme.primary}
                        />
                      </View>
                    )}
                  </View>
                  <View
                    style={[tw`flex-1 justify-center ml-4`, { minWidth: 0 }]}
                  >
                    {renamingId === item.id ? (
                      <View style={tw`flex-row items-center`}>
                        <TextInput
                          value={renameValue}
                          onChangeText={setRenameValue}
                          autoFocus
                          style={[
                            tw`border-2 rounded-lg px-3 py-2 text-base flex-1`,
                            {
                              color: theme.text,
                              borderColor: theme.primary,
                              backgroundColor: theme.background,
                            },
                          ]}
                          onSubmitEditing={() => handleRenameSubmit(item)}
                          onBlur={() => setRenamingId(null)}
                          returnKeyType="done"
                          placeholder="Enter new name"
                          placeholderTextColor={theme.muted}
                        />
                        <TouchableOpacity
                          onPress={() => handleRenameSubmit(item)}
                          style={[
                            tw`ml-2 p-2 rounded-lg`,
                            { backgroundColor: theme.primary },
                          ]}
                        >
                          <MaterialIcons
                            name="check"
                            size={20}
                            color={theme.background}
                          />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <CustomText
                          style={[
                            tw`text-base font-bold mb-1`,
                            { color: theme.text },
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {formatPDFDisplayName(item.name)}
                        </CustomText>
                        <View style={tw`flex-row items-center`}>
                          <MaterialIcons
                            name="schedule"
                            size={12}
                            color={theme.muted}
                            style={tw`mr-1`}
                          />
                          <CustomText
                            style={[tw`text-xs`, { color: theme.muted }]}
                          >
                            {item.date}
                          </CustomText>
                        </View>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
                {/* Actions - Positioned at bottom right */}
                <View
                  style={tw`absolute bottom-6 right-2 flex-row items-center`}
                >
                  <TouchableOpacity
                    style={[
                      tw`mx-0.5 p-1.5 rounded-full items-center justify-center`,
                      { backgroundColor: theme.primary + "20" },
                    ]}
                    onPress={() => handleSaveToDevice(item)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="save"
                      size={16}
                      color={theme.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      tw`mx-0.5 p-1.5 rounded-full items-center justify-center`,
                      { backgroundColor: theme.primary + "20" },
                    ]}
                    onPress={() => handleShare(item)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="share"
                      size={16}
                      color={theme.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      tw`mx-0.5 p-1.5 rounded-full items-center justify-center`,
                      { backgroundColor: theme.primary + "20" },
                    ]}
                    onPress={() => handleRename(item)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="edit"
                      size={16}
                      color={theme.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      tw`mx-0.5 p-1.5 rounded-full items-center justify-center`,
                      { backgroundColor: "#ef4444" + "20" },
                    ]}
                    onPress={() => handleDelete(item)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="delete" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
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
            <CustomText
              style={[tw`text-lg font-bold mb-2`, { color: theme.text }]}
            >
              PDF Details
            </CustomText>
            <CustomText style={[tw`mb-1`, { color: theme.text }]}>
              Name: {detailsPDF?.name}
            </CustomText>
            <CustomText style={[tw`mb-1`, { color: theme.text }]}>
              Date: {detailsPDF?.date}
            </CustomText>
            <CustomText style={[tw`mb-1`, { color: theme.text }]}>
              Size:{" "}
              {detailsSize !== null
                ? `${(detailsSize / 1024).toFixed(1)} KB`
                : "Unknown"}
            </CustomText>
            <CustomText style={[tw`mb-3`, { color: theme.text }]}>
              ID: {detailsPDF?.id}
            </CustomText>
            <View style={[tw`flex-row justify-center mt-2`, { gap: 8 }]}>
              <TouchableOpacity
                style={[
                  tw`px-4 py-2 rounded-lg`,
                  { backgroundColor: theme.primary },
                ]}
                onPress={() => {
                  setDetailsVisible(false);
                  show();
                  router.push("/(tabs)/compress-pdf");
                  setTimeout(() => hide(), 500);
                }}
              >
                <CustomText
                  style={{ color: theme.background, fontWeight: "bold" }}
                >
                  Compress
                </CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  tw`px-4 py-2 rounded-lg`,
                  { backgroundColor: theme.muted },
                ]}
                onPress={() => setDetailsVisible(false)}
              >
                <CustomText
                  style={{ color: theme.background, fontWeight: "bold" }}
                >
                  Close
                </CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
      {/* Floating Action Button for New PDF */}
      {!loading && (
        <TouchableOpacity
          style={[
            tw`absolute right-6 bottom-24 p-5 rounded-full shadow-xl items-center justify-center`,
            {
              backgroundColor: theme.primary,
              zIndex: 20,
              shadowColor: theme.primary,
              shadowOpacity: 0.3,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 12,
            },
          ]}
          onPress={() => {
            show();
            router.push("/image-to-pdf");
            setTimeout(() => hide(), 500);
          }}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={30} color={theme.background} />
        </TouchableOpacity>
      )}
    </View>
  );
}
