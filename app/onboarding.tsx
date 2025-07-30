import { Colors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  StatusBar,
  TouchableOpacity,
  View,
} from "react-native";
import tw from "twrnc";
import CustomText from "./CustomText";

const { width, height } = Dimensions.get("window");

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
}

const onboardingSlides: OnboardingSlide[] = [
  {
    id: "1",
    title: "Welcome to ScanMate",
    description:
      "Your ultimate PDF scanner and document management companion. Transform your documents into high-quality PDFs with just a few taps.",
    icon: "image",
    color: "#4A90E2",
  },
  {
    id: "2",
    title: "Camera Scanning",
    description:
      "Capture documents with your camera and create instant PDFs. Our app preserves original quality and dimensions for professional results.",
    icon: "photo-camera",
    color: "#50C878",
  },
  {
    id: "3",
    title: "Image to PDF",
    description:
      "Convert your existing photos and images into PDF documents. Support for multiple images and high-quality conversion.",
    icon: "image",
    color: "#FF6B6B",
  },
  {
    id: "4",
    title: "PDF Management",
    description:
      "Organize, compress, and manage all your PDFs. Share, rename, and keep your documents organized in one place.",
    icon: "folder",
    color: "#9B59B6",
  },
  {
    id: "5",
    title: "PDF Compression",
    description:
      "Reduce file sizes while maintaining quality. Perfect for sharing large documents via email or messaging apps.",
    icon: "compress",
    color: "#E67E22",
  },
  {
    id: "6",
    title: "Ready to Start",
    description:
      "You're all set! Start scanning your first document and experience the power of ScanMate.",
    icon: "check-circle",
    color: "#F39C12",
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const { actualColorScheme } = useTheme();
  const theme = Colors[actualColorScheme];
  const router = useRouter();
  const [greetingIcon, setGreetingIcon] =
    useState<keyof typeof MaterialIcons.glyphMap>("wb-sunny");
  const [greetingText, setGreetingText] = useState("Good Morning");

  // Set greeting based on time of day
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

  const handleNext = () => {
    if (currentIndex < onboardingSlides.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem("onboardingCompleted", "true");
      console.log("Onboarding completed, navigating to home...");
      router.replace("/(tabs)/home");
    } catch (error) {
      console.error("Error saving onboarding status:", error);
      // Fallback to push if replace fails
      console.log("Trying fallback navigation...");
      router.push("/(tabs)/home");
    }
  };

  const renderSlide = ({
    item,
    index,
  }: {
    item: OnboardingSlide;
    index: number;
  }) => {
    const isLastSlide = index === onboardingSlides.length - 1;

    return (
      <View style={[tw`flex-1 justify-center items-center px-8`, { width }]}>
        {/* Logo */}

        {/* Icon Container */}
        <View
          style={[
            tw`w-32 h-32 rounded-full items-center justify-center mb-8`,
            { backgroundColor: item.color + "20" },
          ]}
        >
          {index === 0 ? (
            <Image
              source={require("../assets/images/logo.jpg")}
              style={tw`w-35 h-35 rounded-xxl`}
              resizeMode="cover"
            />
          ) : (
            <MaterialIcons name={item.icon} size={64} color={item.color} />
          )}
        </View>

        {/* Title */}
        <CustomText
          style={[
            tw`text-3xl text-center mb-4`,
            { color: theme.text, fontFamily: "Poppins-Bold" },
          ]}
        >
          {item.title}
        </CustomText>

        {/* Description */}
        <CustomText
          style={[
            tw`text-lg text-center leading-7`,
            { color: theme.muted, fontFamily: "Poppins-Regular" },
          ]}
        >
          {item.description}
        </CustomText>

        {/* Action Buttons */}
        <View style={tw`mt-12 w-full`}>
          {isLastSlide ? (
            <TouchableOpacity
              style={[
                tw`w-full p-4 rounded-2xl items-center`,
                { backgroundColor: item.color },
              ]}
              onPress={handleComplete}
              activeOpacity={0.85}
            >
              <CustomText
                style={[
                  tw`text-lg`,
                  { color: "#FFFFFF", fontFamily: "Poppins-SemiBold" },
                ]}
              >
                Get Started
              </CustomText>
            </TouchableOpacity>
          ) : (
            <View style={tw`flex-row gap-3`}>
              <TouchableOpacity
                style={[
                  tw`flex-1 p-4 rounded-2xl items-center`,
                  {
                    backgroundColor: theme.card,
                    borderWidth: 2,
                    borderColor: item.color,
                  },
                ]}
                onPress={handleSkip}
                activeOpacity={0.85}
              >
                <CustomText
                  style={[
                    tw`text-lg`,
                    {
                      color: item.color,
                      fontFamily: "Poppins-SemiBold",
                    },
                  ]}
                >
                  Skip
                </CustomText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  tw`flex-1 p-4 rounded-2xl items-center`,
                  { backgroundColor: item.color },
                ]}
                onPress={handleNext}
                activeOpacity={0.85}
              >
                <CustomText
                  style={[
                    tw`text-lg`,
                    { color: "#FFFFFF", fontFamily: "Poppins-SemiBold" },
                  ]}
                >
                  Next
                </CustomText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderPaginationDots = () => {
    return (
      <View style={tw`flex-row justify-center items-center mt-8 mb-4`}>
        {onboardingSlides.map((_, index) => (
          <View
            key={index}
            style={[
              tw`w-2.5 h-2.5 rounded-full mx-1.5`,
              {
                backgroundColor:
                  index === currentIndex
                    ? onboardingSlides[currentIndex].color
                    : theme.muted,
                opacity: index === currentIndex ? 1 : 0.3,
                transform: [{ scale: index === currentIndex ? 1.2 : 1 }],
              },
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={[tw`flex-1`, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={
          actualColorScheme === "dark" ? "light-content" : "dark-content"
        }
        backgroundColor={theme.background}
      />

      {/* Header with Greeting and Skip Button */}
      <View style={tw`flex-row justify-center items-center px-6 pt-12 pb-4`}>
        {/* <View style={tw`flex-row items-center`}>
          <MaterialIcons
            name={greetingIcon}
            size={20}
            color={greetingIcon === "nightlight" ? "#E6C97A" : "#FFD700"}
            style={tw`mr-2`}
          />
          <CustomText
            style={[
              tw`text-sm`,
              {
                color: theme.text,
                opacity: 0.8,
                fontFamily: "Poppins-Regular",
              },
            ]}
          >
            {greetingText}
          </CustomText>
        </View> */}
        <View style={tw`items-center`}>
          <CustomText
            style={[
              tw`text-2xl mr-4`,
              { color: theme.primary, fontFamily: "Poppins-SemiBold" },
            ]}
          >
            ScanMate
          </CustomText>
          {/* <TouchableOpacity
            onPress={handleSkip}
            style={[tw`px-4 py-2 rounded-xl`, { backgroundColor: theme.card }]}
            activeOpacity={0.85}
          >
            <CustomText
              style={[
                tw`text-sm`,
                { color: theme.primary, fontFamily: "Poppins-SemiBold" },
              ]}
            >
              Skip
            </CustomText>
          </TouchableOpacity> */}
        </View>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={onboardingSlides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEnabled={false}
      />

      {/* Pagination Dots */}
      {renderPaginationDots()}

      {/* Progress Bar */}
      <View
        style={[
          tw`h-1.5 mx-6 mb-8 rounded-full`,
          { backgroundColor: theme.card + "40" },
        ]}
      >
        <View
          style={[
            tw`h-1.5 rounded-full`,
            {
              backgroundColor: onboardingSlides[currentIndex].color,
              width: `${((currentIndex + 1) / onboardingSlides.length) * 100}%`,
              shadowColor: onboardingSlides[currentIndex].color,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3,
            },
          ]}
        />
      </View>
    </View>
  );
}
