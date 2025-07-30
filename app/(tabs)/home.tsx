import { Colors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  TouchableOpacity,
  View,
} from "react-native";
import tw from "twrnc";
import { auth } from "../../firebaseConfig";
import { useOnboarding } from "../../hooks/useOnboarding";
import CustomText from "../CustomText";
import { useLoadingOverlay } from "../_layout";

export default function HomeScreen() {
  const router = useRouter();
  const { actualColorScheme, toggleTheme } = useTheme();
  const theme = Colors[actualColorScheme];
  const [pdfs, setPDFs] = useState([]);
  const [greeting, setGreeting] = useState("");
  const [userName, setUserName] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const { isOnboardingCompleted } = useOnboarding();
  const [greetingText, setGreetingText] = useState("Good Morning");
  const [greetingIcon, setGreetingIcon] =
    useState<keyof typeof MaterialIcons.glyphMap>("wb-sunny");

  // Animated value for background color
  const animation = useRef(
    new Animated.Value(actualColorScheme === "dark" ? 1 : 0)
  ).current;
  const prevScheme = useRef(actualColorScheme);

  useEffect(() => {
    if (prevScheme.current !== actualColorScheme) {
      Animated.timing(animation, {
        toValue: actualColorScheme === "dark" ? 1 : 0,
        duration: 400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }).start();
      prevScheme.current = actualColorScheme;
    }
  }, [actualColorScheme]);

  // Interpolate background color
  const backgroundColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.light.background, Colors.dark.background],
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setUserName(u?.displayName || null);
    });
    return unsubscribe;
  }, []);

  // Function to load PDFs from AsyncStorage
  const loadPDFs = useCallback(async () => {
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
  }, []);

  // Load PDFs from AsyncStorage on mount
  useEffect(() => {
    loadPDFs();
  }, [loadPDFs]);

  // Check if user just completed onboarding
  useEffect(() => {
    const checkWelcomeStatus = async () => {
      try {
        const welcomeShown = await AsyncStorage.getItem("welcomeShown");
        if (isOnboardingCompleted && !welcomeShown) {
          setShowWelcome(true);
          await AsyncStorage.setItem("welcomeShown", "true");
        }
      } catch (error) {
        console.error("Error checking welcome status:", error);
      }
    };
    checkWelcomeStatus();
  }, [isOnboardingCompleted]);

  // Reload PDFs when screen comes into focus (e.g., when returning from settings)
  useFocusEffect(
    useCallback(() => {
      loadPDFs();
    }, [loadPDFs])
  );

  React.useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreetingText("Good Morning");
      setGreetingIcon("wb-sunny");
    } else if (hour < 18) {
      setGreetingText("Good Afternoon");
      setGreetingIcon("wb-sunny");
    } else {
      setGreetingText("Good Evening");
      setGreetingIcon("nightlight");
    }
  }, []);

  const { show, hide } = useLoadingOverlay();

  return (
    <Animated.View style={[tw`flex-1 px-5 pt-14 pb-6`, { backgroundColor }]}>
      {/* Logo and greeting */}
      <View style={tw`flex-row items-center justify-between mt-2`}>
        <View style={tw`flex-row items-center`}>
          <View>
            <CustomText
              style={[
                tw`text-4xl -mb-1`,
                { color: theme.text, fontFamily: "Poppins-Bold" },
              ]}
            >
              {userName ? `Hi, ${userName}` : "Hi there!"}
            </CustomText>
            <View style={tw`flex-row items-center mt-2`}>
              <CustomText
                style={[
                  tw`text-base`,
                  {
                    color: theme.muted,
                    fontFamily: "Poppins-Regular",
                  },
                ]}
              >
                {greetingText}
              </CustomText>
              <MaterialIcons
                name={greetingIcon}
                size={24}
                color={theme.primary}
                style={tw`ml-1`}
              />
            </View>
          </View>
        </View>
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity
            onPress={toggleTheme}
            activeOpacity={0.7}
            style={[tw`rounded-full p-3 mr-3`, { backgroundColor: theme.card }]}
          >
            <MaterialIcons
              name={actualColorScheme === "dark" ? "light-mode" : "dark-mode"}
              size={24}
              color={theme.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            activeOpacity={0.7}
            style={[
              tw`rounded-full border-2 border-gray-200`,
              {
                width: 72,
                height: 72,
                overflow: "hidden",
                backgroundColor: "#fff",
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            {/* Random avatar using DiceBear */}
            <Image
              source={{
                uri: `https://api.dicebear.com/7.x/adventurer-neutral/png?seed=${Math.random()
                  .toString(36)
                  .substring(2, 10)}`,
              }}
              style={{ width: 64, height: 64, borderRadius: 32 }}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </View>
      </View>
      {/* Feature cards */}
      <View style={tw`flex-col gap-5 mt-10`}>
        {/* Scan Document Card */}
        <TouchableOpacity
          style={[
            tw`rounded-2xl px-5 py-8 flex-row items-center mb-2`,
            { backgroundColor: theme.cardSmart },
          ]}
          onPress={() => router.push("/camera")}
          activeOpacity={0.9}
        >
          <View
            style={[
              tw`mr-4`,
              { backgroundColor: "#fff2", borderRadius: 32, padding: 12 },
            ]}
          >
            <MaterialIcons
              name="photo-camera"
              size={28}
              color={theme.primary}
            />
          </View>
          <View style={tw`flex-1`}>
            <CustomText
              style={[
                tw`text-lg`,
                { color: theme.text, fontFamily: "Poppins-SemiBold" },
              ]}
            >
              Scan Document
            </CustomText>
            <CustomText style={[tw`text-base`, { color: theme.muted }]}>
              Camera to PDF – Instantly
            </CustomText>
          </View>
        </TouchableOpacity>
        {/* Image to PDF Card */}
        <TouchableOpacity
          style={[
            tw`rounded-2xl px-5 py-8 flex-row items-center mb-2`,
            { backgroundColor: theme.cardHashtag },
          ]}
          onPress={() => router.push("/image-to-pdf")}
          activeOpacity={0.9}
        >
          <View
            style={[
              tw`mr-4`,
              { backgroundColor: "#fff2", borderRadius: 32, padding: 12 },
            ]}
          >
            <MaterialIcons name="image" size={28} color={theme.primary} />
          </View>
          <View style={tw`flex-1`}>
            <CustomText
              style={[
                tw`text-lg`,
                { color: theme.text, fontFamily: "Poppins-SemiBold" },
              ]}
            >
              Image to PDF
            </CustomText>
            <CustomText style={[tw`text-base`, { color: theme.muted }]}>
              Convert any image into PDF
            </CustomText>
          </View>
        </TouchableOpacity>
        {/* Compress PDF Card */}
        <TouchableOpacity
          style={[
            tw`rounded-2xl px-5 py-8 flex-row items-center mb-2`,
            { backgroundColor: theme.cardImage },
          ]}
          onPress={() => {
            show();
            router.push("/(tabs)/compress-pdf");
            setTimeout(() => hide(), 500);
          }}
          activeOpacity={0.9}
        >
          <View
            style={[
              tw`mr-4`,
              { backgroundColor: "#fff2", borderRadius: 32, padding: 12 },
            ]}
          >
            <MaterialIcons name="compress" size={28} color={theme.primary} />
          </View>
          <View style={tw`flex-1`}>
            <CustomText
              style={[
                tw`text-lg`,
                { color: theme.text, fontFamily: "Poppins-SemiBold" },
              ]}
            >
              Compress PDF
            </CustomText>
            <CustomText
              style={[
                tw`text-base`,
                { color: theme.muted, fontFamily: "Poppins-Regular" },
              ]}
            >
              Smaller file, easier sharing
            </CustomText>
          </View>
        </TouchableOpacity>
      </View>

      {/* Welcome Modal */}
      <Modal
        visible={showWelcome}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWelcome(false)}
      >
        <View
          style={[
            tw`flex-1 justify-center items-center`,
            { backgroundColor: "rgba(0, 0, 0, 0.5)" },
          ]}
        >
          <View
            style={[
              tw`w-80 rounded-3xl p-8 items-center`,
              { backgroundColor: theme.card },
            ]}
          >
            <View
              style={[
                tw`w-20 h-20 rounded-full items-center justify-center mb-6`,
                { backgroundColor: theme.primary + "20" },
              ]}
            >
              <MaterialIcons
                name="celebration"
                size={40}
                color={theme.primary}
              />
            </View>

            <CustomText
              style={[
                tw`text-2xl text-center mb-3`,
                { color: theme.text, fontFamily: "Poppins-Bold" },
              ]}
            >
              Welcome to ScanMate! 🎉
            </CustomText>

            <CustomText
              style={[
                tw`text-base text-center mb-6 leading-6`,
                {
                  color: theme.muted,
                  fontFamily: "Poppins-Regular",
                },
              ]}
            >
              You&apos;re all set to start scanning and managing your documents.
              Tap the camera button to scan your first document!
            </CustomText>

            <TouchableOpacity
              style={[
                tw`w-full p-4 rounded-2xl items-center`,
                { backgroundColor: theme.primary },
              ]}
              onPress={() => setShowWelcome(false)}
              activeOpacity={0.85}
            >
              <CustomText
                style={[
                  tw`text-lg`,
                  { color: theme.background, fontFamily: "Poppins-SemiBold" },
                ]}
              >
                Let&apos;s Get Started!
              </CustomText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}
