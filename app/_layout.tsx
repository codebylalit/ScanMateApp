import { Colors } from "@/constants/Colors";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, Animated, Easing } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useOnboarding } from "../hooks/useOnboarding";
import CustomText from "./CustomText";
import OnboardingScreen from "./onboarding";

// Loading overlay context
const LoadingOverlayContext = createContext({
  show: () => {},
  hide: () => {},
});

export function useLoadingOverlay() {
  return useContext(LoadingOverlayContext);
}

function LoadingOverlay({ visible }: { visible: boolean }) {
  const { actualColorScheme } = useTheme();
  const theme = Colors[actualColorScheme];
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;
  return (
    <Animated.View
      pointerEvents="auto"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.background + "CC", // semi-transparent
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        opacity: fadeAnim,
      }}
    >
      <ActivityIndicator size="large" color={theme.primary} />
    </Animated.View>
  );
}

// Add Toast context and provider
const ToastContext = createContext({
  show: (msg: string, type?: "success" | "error" | "info") => {},
});

export function useToast() {
  return useContext(ToastContext);
}

function Toast({
  message,
  type,
  visible,
}: {
  message: string;
  type: "success" | "error" | "info";
  visible: boolean;
}) {
  const { actualColorScheme } = useTheme();
  const theme = Colors[actualColorScheme];
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;
  let bgColor = theme.primary;
  if (type === "success") bgColor = "#22c55e";
  if (type === "error") bgColor = "#ef4444";
  if (type === "info") bgColor = theme.primary;

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 48,
        left: 24,
        right: 24,
        padding: 16,
        borderRadius: 16,
        backgroundColor: bgColor,
        alignItems: "center",
        zIndex: 10000,
        opacity: fadeAnim,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 2 },
        elevation: 12,
      }}
      pointerEvents="none"
    >
      <CustomText
        style={{
          color: theme.background,
          fontFamily: "Poppins-SemiBold",
          fontSize: 16,
        }}
      >
        {message}
      </CustomText>
    </Animated.View>
  );
}

export default function RootLayout() {
  const { isOnboardingCompleted, isLoading } = useOnboarding();
  const [fontsLoaded] = useFonts({
    "Poppins-Regular": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Black": require("../assets/fonts/Poppins-Black.ttf"),
    "Poppins-Light": require("../assets/fonts/Poppins-Light.ttf"),
    "Poppins-ExtraBold": require("../assets/fonts/Poppins-ExtraBold.ttf"),
  });
  const [loading, setLoading] = useState(false);
  const show = () => setLoading(true);
  const hide = () => setLoading(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
    visible: boolean;
  }>({ message: "", type: "info", visible: false });
  const toastTimeout = useRef<number | null>(null);
  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    setToast({ message, type, visible: true });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(
      () => setToast((t) => ({ ...t, visible: false })),
      2200
    );
  };

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <ToastContext.Provider value={{ show: showToast }}>
          <LoadingOverlayContext.Provider value={{ show, hide }}>
            <ThemeLoader
              fontsLoaded={fontsLoaded}
              isOnboardingCompleted={isOnboardingCompleted}
              isLoading={isLoading}
            />
            <LoadingOverlay visible={loading} />
            <Toast
              message={toast.message}
              type={toast.type}
              visible={toast.visible}
            />
          </LoadingOverlayContext.Provider>
        </ToastContext.Provider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

function ThemeLoader({
  fontsLoaded,
  isOnboardingCompleted,
  isLoading,
}: {
  fontsLoaded: boolean;
  isOnboardingCompleted: boolean | null;
  isLoading: boolean;
}) {
  const { actualColorScheme, isLoading: themeLoading } = useTheme();
  const theme = Colors[actualColorScheme];

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

  if (
    !fontsLoaded ||
    isLoading ||
    themeLoading ||
    isOnboardingCompleted === null
  ) {
    return (
      <Animated.View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor,
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </Animated.View>
    );
  }

  if (!isOnboardingCompleted) {
    return <OnboardingScreen />;
  }

  return (
    <Animated.View style={{ flex: 1, backgroundColor }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade", // Smooth fade transition for stack navigation
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="onboarding"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
      </Stack>
    </Animated.View>
  );
}
