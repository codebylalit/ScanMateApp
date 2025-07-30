import { Colors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Share,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import tw from "twrnc";
import { auth } from "../../firebaseConfig";
import { useOnboarding } from "../../hooks/useOnboarding";
import CustomText from "../CustomText";
import { useLoadingOverlay, useToast } from "../_layout";

export default function SettingsScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const { actualColorScheme, themeMode, toggleTheme, setTheme } = useTheme();
  const theme = Colors[actualColorScheme];
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [namePrompt, setNamePrompt] = useState(false);
  const [editName, setEditName] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  // State for showing inline login/signup form and which mode
  const [showAuthForm, setShowAuthForm] = useState<"login" | "signup" | null>(
    null
  );
  const [signupName, setSignupName] = useState("");
  const [authError, setAuthError] = useState("");
  const [saveLocation, setSaveLocation] = useState("documents"); // "documents" or "downloads"
  const [scanQuality, setScanQuality] = useState("high"); // "low", "medium", "high"
  const [showQualityModal, setShowQualityModal] = useState(false);
  const { resetOnboarding } = useOnboarding();
  const { show, hide } = useLoadingOverlay();
  const toast = useToast();
  const [showThemeModal, setShowThemeModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      console.log("Auth state changed:", u);
      setUser(u);
      setAuthLoading(false);
      if (u && u.email) {
        setEmail(u.email);
        setName(u.displayName || "");
      } else {
        setName("");
      }
    });
    return unsubscribe;
  }, []);

  // Load saved preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedQuality = await AsyncStorage.getItem("scanQuality");
        if (savedQuality) {
          setScanQuality(savedQuality);
        }
      } catch (error) {
        console.log("Error loading preferences:", error);
      }
    };
    loadPreferences();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.show("Please enter both email and password.", "info");
      return;
    }
    if (password.length < 6) {
      toast.show("Password must be at least 6 characters.", "info");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      if (e.code === "auth/user-not-found") {
        toast.show("No account found. Please sign up first.", "info");
      } else if (e.code === "auth/wrong-password") {
        toast.show("Incorrect password. Please try again.", "info");
      } else if (e.code === "auth/invalid-email") {
        toast.show("Please enter a valid email address.", "info");
      } else {
        toast.show(e.message, "error");
      }
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !signupName.trim()) {
      setAuthError("Please enter name, email, and password.");
      return;
    }
    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: signupName.trim() });
      setShowAuthForm(null);
      setSignupName("");
      setAuthError("");
    } catch (err: any) {
      setAuthError(err.message || "Sign up failed");
    }
  };

  const handleSaveName = async () => {
    if (!name.trim() || !user) {
      toast.show("Please enter your name.", "info");
      return;
    }
    await updateProfile(user, { displayName: name.trim() });
    setNamePrompt(false);
    setEditName(false);
  };

  const handleLogout = async () => {
    if (!user || loggingOut) return;
    setLoggingOut(true);
    await signOut(auth);
    setName("");
    setLoggingOut(false);
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message:
          "Check out ScanMate - The best PDF scanner app! Download it now.",
        url: "https://your-app-store-link.com", // Replace with your actual app store link
        title: "ScanMate - PDF Scanner",
      });
    } catch (error) {
      console.error("Error sharing app:", error);
    }
  };

  const handleContactSupport = () => {
    toast.show("Would you like to send an email to our support team?", "info");
    // Optionally, you can still open the email client directly if needed
    // Linking.openURL(`mailto:visionovaofficial@gmail.com?subject=ScanMate Support Request`);
  };

  const handleSaveLocationChange = (location: string) => {
    setSaveLocation(location);
    // Here you would typically save this preference to AsyncStorage
    // and update your scan saving logic
  };

  const handleQualityChange = async (quality: string) => {
    setScanQuality(quality);
    // Save to AsyncStorage
    await AsyncStorage.setItem("scanQuality", quality);
    setShowQualityModal(false);
  };

  const handleClearAllPDFs = async () => {
    try {
      // First, get the current PDFs to delete their files
      const savedPDFs = await AsyncStorage.getItem("pdfs");
      let pdfsToDelete = [];

      if (savedPDFs) {
        pdfsToDelete = JSON.parse(savedPDFs);
      }

      // Delete all PDF files from the file system
      const deletePromises = pdfsToDelete.map(async (pdf: any) => {
        if (pdf.uri) {
          try {
            // Remove file:// prefix if present for FileSystem operations
            const filePath = pdf.uri.replace("file://", "");
            await FileSystem.deleteAsync(filePath, { idempotent: true });
          } catch (error) {
            console.log(`Failed to delete file ${pdf.uri}:`, error);
          }
        }
        // Also delete thumbnail if it exists
        if (pdf.thumbUri) {
          try {
            const thumbPath = pdf.thumbUri.replace("file://", "");
            await FileSystem.deleteAsync(thumbPath, { idempotent: true });
          } catch (error) {
            console.log(`Failed to delete thumbnail ${pdf.thumbUri}:`, error);
          }
        }
      });

      // Wait for all file deletions to complete
      await Promise.all(deletePromises);

      // Clear PDFs from AsyncStorage
      await AsyncStorage.removeItem("pdfs");

      toast.show("All PDF files have been cleared successfully.", "success");
    } catch (error) {
      console.error("Error clearing PDFs:", error);
      toast.show("Failed to clear PDF files. Please try again.", "error");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    try {
      // Here you would implement the logic to delete the user account
      // This could involve:
      // 1. Deleting user data from Firebase
      // 2. Clearing local storage
      // 3. Deleting all user files

      // For now, we'll just sign out the user
      await signOut(auth);

      toast.show("Your account has been successfully deleted.", "success");
    } catch (error) {
      toast.show("Failed to delete account. Please try again.", "error");
    }
  };

  const handleViewOnboarding = async () => {
    try {
      await resetOnboarding();
      show();
      router.push("/onboarding");
      setTimeout(() => hide(), 500);
    } catch (error) {
      console.error("Error navigating to onboarding:", error);
    }
  };

  if (authLoading) {
    return (
      <View
        style={[
          tw`flex-1 justify-center items-center`,
          { backgroundColor: theme.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Scan Quality Modal
  if (showQualityModal) {
    return (
      <View
        style={[
          tw`flex-1 justify-center items-center`,
          { backgroundColor: theme.background },
        ]}
      >
        <View
          style={[
            tw`w-full max-w-sm rounded-2xl p-6 shadow-lg`,
            { backgroundColor: theme.card },
          ]}
        >
          <CustomText
            style={[
              tw`text-xl mb-4 text-center`,
              { color: theme.primary, fontFamily: "Poppins-Bold" },
            ]}
          >
            Scan Quality
          </CustomText>

          <CustomText style={[tw`text-sm mb-4`, { color: theme.muted }]}>
            Choose the quality for your scans:
          </CustomText>

          {["low", "medium", "high"].map((quality) => (
            <TouchableOpacity
              key={quality}
              style={[
                tw`flex-row items-center justify-between p-4 rounded-xl mb-3`,
                {
                  backgroundColor:
                    scanQuality === quality
                      ? theme.primary + "20"
                      : theme.background,
                  borderWidth: 1,
                  borderColor:
                    scanQuality === quality ? theme.primary : theme.border,
                },
              ]}
              onPress={() => handleQualityChange(quality)}
            >
              <View style={tw`flex-row items-center`}>
                <MaterialIcons
                  name={
                    quality === "high"
                      ? "high-quality"
                      : quality === "medium"
                      ? "filter-center-focus"
                      : "blur-on"
                  }
                  size={24}
                  color={scanQuality === quality ? theme.primary : theme.muted}
                />
                <CustomText
                  style={[
                    tw`ml-3 text-base capitalize`,
                    {
                      color:
                        scanQuality === quality ? theme.primary : theme.text,
                      fontFamily: "Poppins-SemiBold",
                    },
                  ]}
                >
                  {quality}
                </CustomText>
              </View>
              {scanQuality === quality && (
                <MaterialIcons name="check" size={24} color={theme.primary} />
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[
              tw`w-full p-3 rounded-xl mt-4`,
              {
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.primary,
              },
            ]}
            onPress={() => setShowQualityModal(false)}
          >
            <CustomText
              style={[
                tw`text-center`,
                { color: theme.primary, fontFamily: "Poppins-SemiBold" },
              ]}
            >
              Cancel
            </CustomText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // If not logged in, show settings but with a sign in button instead of profile
  // If namePrompt, show name prompt modal
  if (!user && namePrompt) {
    return (
      <View
        style={[
          tw`flex-1 justify-center items-center`,
          { backgroundColor: theme.background },
        ]}
      >
        <View
          style={[
            tw`w-full max-w-xs rounded-2xl p-7 shadow-lg`,
            { backgroundColor: theme.card, alignItems: "center" },
          ]}
        >
          <CustomText
            style={[
              tw`text-2xl mb-4 text-center`,
              { color: theme.primary, fontFamily: "Poppins-Bold" },
            ]}
          >
            Enter your name
          </CustomText>
          <TextInput
            style={[
              tw`rounded-xl p-4 mb-4 text-base`,
              {
                backgroundColor: theme.background,
                color: theme.text,
                borderWidth: 1,
                borderColor: theme.border,
                width: "100%",
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={theme.text + "99"}
            autoCapitalize="words"
          />
          <TouchableOpacity
            style={[
              tw`w-full mt-2 mb-4 p-4 rounded-xl items-center`,
              { backgroundColor: theme.primary },
            ]}
            onPress={handleSaveName}
            activeOpacity={0.85}
          >
            <CustomText
              style={[
                tw`text-base`,
                { color: theme.background, fontFamily: "Poppins-SemiBold" },
              ]}
            >
              Save
            </CustomText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // If logged in, show profile/settings and logout button
  return (
    <View
      style={[tw`flex-1 px-4 pt-8 pb-6`, { backgroundColor: theme.background }]}
    >
      {/* Header with Logo and Back Button */}
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
          Settings
        </CustomText>
      </View>
      {/* Profile Card or Auth Buttons/Form */}
      {user ? (
        <View
          style={[
            tw`mb-8 rounded-2xl p-6 shadow-lg flex-row items-center`,
            {
              backgroundColor: theme.card,
              shadowColor: theme.primary,
              shadowOpacity: 0.08,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
            },
          ]}
        >
          <View
            style={[
              tw`w-16 h-16 rounded-full items-center justify-center mr-4`,
              { backgroundColor: theme.primary },
            ]}
          >
            <CustomText
              style={{
                color: theme.background,
                fontSize: 28,
                fontFamily: "Poppins-Bold",
              }}
            >
              {name[0]}
            </CustomText>
          </View>
          <View style={tw`flex-1`}>
            <CustomText
              style={[
                tw`text-lg mb-1`,
                { color: theme.text, fontFamily: "Poppins-SemiBold" },
              ]}
            >
              {name}
            </CustomText>
            <View style={tw`flex-row items-center justify-between`}>
              <CustomText style={[tw`text-base mb-1`, { color: theme.muted }]}>
                {email}
              </CustomText>
              <TouchableOpacity
                onPress={handleLogout}
                disabled={loggingOut}
                style={[
                  tw`p-2 rounded-full`,
                  {
                    backgroundColor: theme.primary + "15",
                    opacity: loggingOut ? 0.6 : 1,
                  },
                ]}
                activeOpacity={0.7}
              >
                <MaterialIcons name="logout" size={18} color={theme.primary} />
              </TouchableOpacity>
            </View>
            {!editName ? (
              <TouchableOpacity
                onPress={() => setEditName(true)}
                style={[
                  tw`mt-1 px-3 py-2 rounded-lg`,
                  {
                    backgroundColor: theme.primary + "22",
                    alignSelf: "flex-start",
                  },
                ]}
              >
                <CustomText
                  style={[
                    tw`text-xs`,
                    { color: theme.primary, fontFamily: "Poppins-SemiBold" },
                  ]}
                >
                  Edit Name
                </CustomText>
              </TouchableOpacity>
            ) : (
              <View style={tw`flex-row items-center mt-1`}>
                <TextInput
                  style={[
                    tw`rounded-lg p-2 text-base mr-2`,
                    {
                      backgroundColor: theme.background,
                      color: theme.text,
                      borderWidth: 1,
                      borderColor: theme.border,
                      minWidth: 100,
                    },
                  ]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={theme.text + "99"}
                  autoCapitalize="words"
                />
                <TouchableOpacity
                  onPress={async () => {
                    await updateProfile(user, { displayName: name.trim() });
                    setEditName(false);
                  }}
                  style={[
                    tw`px-3 py-2 rounded-lg`,
                    { backgroundColor: theme.primary },
                  ]}
                >
                  <CustomText
                    style={[
                      tw`text-xs`,
                      {
                        color: theme.background,
                        fontFamily: "Poppins-SemiBold",
                      },
                    ]}
                  >
                    Save
                  </CustomText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View
          style={[
            tw`mb-8 rounded-2xl p-6 shadow-lg flex-row items-center justify-center`,
            {
              backgroundColor: theme.card,
              shadowColor: theme.primary,
              shadowOpacity: 0.08,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
            },
          ]}
        >
          {showAuthForm === "login" ? (
            <View style={{ width: "100%" }}>
              <CustomText
                style={[
                  tw`text-lg mb-4 text-center`,
                  { color: theme.primary, fontFamily: "Poppins-Bold" },
                ]}
              >
                Sign In
              </CustomText>
              {authError ? (
                <CustomText style={[tw`mb-2 text-center`, { color: "red" }]}>
                  {authError}
                </CustomText>
              ) : null}
              <TextInput
                style={[
                  tw`rounded-xl p-4 mb-3 text-base`,
                  {
                    backgroundColor: theme.background,
                    color: theme.text,
                    borderWidth: 1,
                    borderColor: theme.border,
                  },
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={theme.text + "99"}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={[
                  tw`rounded-xl p-4 mb-3 text-base`,
                  {
                    backgroundColor: theme.background,
                    color: theme.text,
                    borderWidth: 1,
                    borderColor: theme.border,
                  },
                ]}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={theme.text + "99"}
                secureTextEntry
              />
              <TouchableOpacity
                style={[
                  tw`w-full mb-3 p-4 rounded-xl items-center`,
                  { backgroundColor: theme.primary },
                ]}
                onPress={handleLogin}
                activeOpacity={0.85}
              >
                <CustomText
                  style={[
                    tw`text-base`,
                    { color: theme.background, fontFamily: "Poppins-SemiBold" },
                  ]}
                >
                  Login
                </CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  tw`w-full p-3 rounded-xl items-center`,
                  {
                    backgroundColor: theme.card,
                    borderWidth: 1,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => setShowAuthForm(null)}
                activeOpacity={0.85}
              >
                <CustomText
                  style={[
                    tw`text-base`,
                    { color: theme.primary, fontFamily: "Poppins-Regular" },
                  ]}
                >
                  Cancel
                </CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`mt-2`}
                onPress={() => {
                  setShowAuthForm("signup");
                  setAuthError("");
                }}
              >
                <CustomText
                  style={[tw`text-sm text-center`, { color: theme.primary }]}
                >
                  Don&apos;t have an account? Sign Up
                </CustomText>
              </TouchableOpacity>
            </View>
          ) : showAuthForm === "signup" ? (
            <View style={{ width: "100%" }}>
              <CustomText
                style={[
                  tw`text-lg mb-4 text-center`,
                  { color: theme.primary, fontFamily: "Poppins-Bold" },
                ]}
              >
                Sign Up
              </CustomText>
              {authError ? (
                <CustomText style={[tw`mb-2 text-center`, { color: "red" }]}>
                  {authError}
                </CustomText>
              ) : null}
              <TextInput
                style={[
                  tw`rounded-xl p-4 mb-3 text-base`,
                  {
                    backgroundColor: theme.background,
                    color: theme.text,
                    borderWidth: 1,
                    borderColor: theme.border,
                  },
                ]}
                value={signupName}
                onChangeText={setSignupName}
                placeholder="Your name"
                placeholderTextColor={theme.text + "99"}
                autoCapitalize="words"
              />
              <TextInput
                style={[
                  tw`rounded-xl p-4 mb-3 text-base`,
                  {
                    backgroundColor: theme.background,
                    color: theme.text,
                    borderWidth: 1,
                    borderColor: theme.border,
                  },
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={theme.text + "99"}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={[
                  tw`rounded-xl p-4 mb-3 text-base`,
                  {
                    backgroundColor: theme.background,
                    color: theme.text,
                    borderWidth: 1,
                    borderColor: theme.border,
                  },
                ]}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={theme.text + "99"}
                secureTextEntry
              />
              <TouchableOpacity
                style={[
                  tw`w-full mb-3 p-4 rounded-xl items-center`,
                  { backgroundColor: theme.primary },
                ]}
                onPress={handleSignUp}
                activeOpacity={0.85}
              >
                <CustomText
                  style={[
                    tw`text-base`,
                    { color: theme.background, fontFamily: "Poppins-SemiBold" },
                  ]}
                >
                  Create Account
                </CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  tw`w-full p-3 rounded-xl items-center`,
                  {
                    backgroundColor: theme.card,
                    borderWidth: 1,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => setShowAuthForm(null)}
                activeOpacity={0.85}
              >
                <CustomText
                  style={[
                    tw`text-base`,
                    { color: theme.primary, fontFamily: "Poppins-Regular" },
                  ]}
                >
                  Cancel
                </CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`mt-2`}
                onPress={() => {
                  setShowAuthForm("login");
                  setAuthError("");
                }}
              >
                <CustomText
                  style={[tw`text-sm text-center`, { color: theme.primary }]}
                >
                  Already have an account? Sign In
                </CustomText>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CustomText
                style={[
                  tw`text-base text-center`,
                  { color: theme.text, fontFamily: "Poppins-Regular" },
                ]}
              >
                You are not signed in.
              </CustomText>
              {/* <TouchableOpacity
                style={[
                  tw`ml-4 px-4 py-2 rounded-xl`,
                  { backgroundColor: theme.primary },
                ]}
                onPress={() => setShowAuthForm("login")}
                activeOpacity={0.85}
              >
                <CustomText
                  style={[
                    { color: theme.background, fontFamily: "Poppins-SemiBold" },
                  ]}
                >
                  Sign In
                </CustomText>
              </TouchableOpacity> */}
              <TouchableOpacity
                style={[
                  tw`ml-4 px-4 py-2 rounded-xl mt-2`,
                  { backgroundColor: theme.primary },
                ]}
                onPress={() => setShowAuthForm("signup")}
                activeOpacity={0.85}
              >
                <CustomText
                  style={[
                    { color: theme.background, fontFamily: "Poppins-SemiBold" },
                  ]}
                >
                  Sign Up
                </CustomText>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* App Settings Section */}
      <CustomText
        style={[tw`mb-2 ml-1 text-base font-semibold`, { color: theme.muted }]}
      >
        App Settings
      </CustomText>
      <View
        style={[
          tw`mb-6 rounded-2xl p-5 shadow-lg`,
          {
            backgroundColor: theme.card,
            shadowColor: theme.primary,
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
          },
        ]}
      >
        <TouchableOpacity
          style={[
            tw`flex-row items-center justify-between p-3 rounded-xl mb-3`,
            { backgroundColor: theme.background },
          ]}
          onPress={handleViewOnboarding}
          activeOpacity={0.85}
        >
          <View style={tw`flex-row items-center`}>
            <MaterialIcons name="school" size={24} color={theme.primary} />
            <CustomText
              style={[
                tw`ml-3 text-base`,
                { color: theme.text, fontFamily: "Poppins-SemiBold" },
              ]}
            >
              View Onboarding
            </CustomText>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={theme.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            tw`flex-row items-center justify-between p-3 rounded-xl mb-3`,
            { backgroundColor: theme.background },
          ]}
          onPress={() => setShowThemeModal(true)}
          activeOpacity={0.85}
        >
          <View style={tw`flex-row items-center`}>
            <MaterialIcons
              name={actualColorScheme === "dark" ? "dark-mode" : "light-mode"}
              size={24}
              color={theme.primary}
            />
            <CustomText
              style={[
                tw`ml-3 text-base`,
                { color: theme.text, fontFamily: "Poppins-SemiBold" },
              ]}
            >
              Theme
            </CustomText>
          </View>
          <View style={tw`flex-row items-center`}>
            <CustomText
              style={[
                tw`mr-2 text-sm`,
                { color: theme.muted, fontFamily: "Poppins-Regular" },
              ]}
            >
              {themeMode === "system"
                ? "System"
                : themeMode === "light"
                ? "Light"
                : "Dark"}
            </CustomText>
            <MaterialIcons name="chevron-right" size={24} color={theme.muted} />
          </View>
        </TouchableOpacity>
        <Modal
          visible={showThemeModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowThemeModal(false)}
        >
          <View
            style={[
              tw`flex-1 justify-center items-center`,
              { backgroundColor: "rgba(0,0,0,0.3)" },
            ]}
          >
            <View
              style={[
                tw`w-80 rounded-3xl p-6`,
                { backgroundColor: theme.card, alignItems: "center" },
              ]}
            >
              <CustomText
                style={[
                  tw`text-lg mb-4`,
                  { color: theme.text, fontFamily: "Poppins-Bold" },
                ]}
              >
                Choose Theme
              </CustomText>
              <TouchableOpacity
                style={[
                  tw`w-full p-3 rounded-xl mb-2`,
                  { backgroundColor: theme.background },
                ]}
                onPress={() => {
                  setTheme("system");
                  setShowThemeModal(false);
                }}
              >
                <CustomText
                  style={{
                    color: theme.text,
                    fontFamily: "Poppins-SemiBold",
                    textAlign: "center",
                  }}
                >
                  System
                </CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  tw`w-full p-3 rounded-xl mb-2`,
                  { backgroundColor: theme.background },
                ]}
                onPress={() => {
                  setTheme("light");
                  setShowThemeModal(false);
                }}
              >
                <CustomText
                  style={{
                    color: theme.text,
                    fontFamily: "Poppins-SemiBold",
                    textAlign: "center",
                  }}
                >
                  Light
                </CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  tw`w-full p-3 rounded-xl`,
                  { backgroundColor: theme.background },
                ]}
                onPress={() => {
                  setTheme("dark");
                  setShowThemeModal(false);
                }}
              >
                <CustomText
                  style={{
                    color: theme.text,
                    fontFamily: "Poppins-SemiBold",
                    textAlign: "center",
                  }}
                >
                  Dark
                </CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  tw`w-full p-3 rounded-xl mt-2`,
                  { backgroundColor: theme.cardSmart },
                ]}
                onPress={() => setShowThemeModal(false)}
              >
                <CustomText
                  style={{
                    color: theme.text,
                    fontFamily: "Poppins-Regular",
                    textAlign: "center",
                  }}
                >
                  Cancel
                </CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <TouchableOpacity
          style={[
            tw`flex-row items-center justify-between p-3 rounded-xl`,
            { backgroundColor: theme.background },
          ]}
          onPress={() => {
            Alert.alert(
              "Clear All PDFs",
              "Are you sure you want to delete all your PDF files? This action cannot be undone.",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Clear All",
                  style: "destructive",
                  onPress: handleClearAllPDFs,
                },
              ]
            );
          }}
          activeOpacity={0.85}
        >
          <View style={tw`flex-row items-center`}>
            <MaterialIcons name="delete-sweep" size={24} color="#FF6B6B" />
            <CustomText
              style={[
                tw`ml-3 text-base`,
                { color: "#FF6B6B", fontFamily: "Poppins-SemiBold" },
              ]}
            >
              Clear All PDFs
            </CustomText>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={theme.muted} />
        </TouchableOpacity>
      </View>

      {/* Support Section */}
      <CustomText
        style={[tw`mb-2 ml-1 text-base font-semibold`, { color: theme.muted }]}
      >
        Support
      </CustomText>
      <View
        style={[
          tw`mb-6 rounded-2xl p-5 shadow-lg`,
          {
            backgroundColor: theme.card,
            shadowColor: theme.primary,
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
          },
        ]}
      >
        <TouchableOpacity
          style={[
            tw`flex-row items-center justify-between p-3 rounded-xl mb-3`,
            { backgroundColor: theme.background },
          ]}
          onPress={handleShareApp}
          activeOpacity={0.85}
        >
          <View style={tw`flex-row items-center`}>
            <MaterialIcons name="share" size={24} color={theme.primary} />
            <CustomText
              style={[
                tw`ml-3 text-base`,
                { color: theme.text, fontFamily: "Poppins-SemiBold" },
              ]}
            >
              Share App
            </CustomText>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={theme.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            tw`flex-row items-center justify-between p-3 rounded-xl`,
            { backgroundColor: theme.background },
          ]}
          onPress={handleContactSupport}
          activeOpacity={0.85}
        >
          <View style={tw`flex-row items-center`}>
            <MaterialIcons
              name="support-agent"
              size={24}
              color={theme.primary}
            />
            <CustomText
              style={[
                tw`ml-3 text-base`,
                { color: theme.text, fontFamily: "Poppins-SemiBold" },
              ]}
            >
              Contact Support
            </CustomText>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={theme.muted} />
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <CustomText
        style={[tw`mb-2 ml-1 text-base font-semibold`, { color: theme.muted }]}
      ></CustomText>
      <View style={tw`items-center mb-8`}>
        <CustomText style={[tw`text-sm mb-1`, { color: theme.muted }]}>
          ScanMate v1.0.0
        </CustomText>
        <CustomText style={[tw`text-sm mb-1`, { color: theme.muted }]}>
          © 2025 All Rights Reserved
        </CustomText>
      </View>
    </View>
  );
}
