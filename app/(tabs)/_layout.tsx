import { Colors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { useFonts } from "expo-font";
import { Tabs, useSegments } from "expo-router";
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Easing } from "react-native";
import CustomTabBar from "./CustomTabBar";

export const FontTextContext = React.createContext({
  fontFamily: "Poppins-Regular",
});

export default function TabLayout() {
  const { actualColorScheme } = useTheme();
  const theme = Colors[actualColorScheme];
  const segments = useSegments();
  const currentTab = segments[segments.length - 1];

  const [fontsLoaded] = useFonts({
    "Poppins-Regular": require("../../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-Bold": require("../../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-SemiBold": require("../../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Black": require("../../assets/fonts/Poppins-Black.ttf"),
    "Poppins-Light": require("../../assets/fonts/Poppins-Light.ttf"),
    "Poppins-ExtraBold": require("../../assets/fonts/Poppins-ExtraBold.ttf"),
  });

  // Animated value for background color
  const animation = useRef(
    new Animated.Value(actualColorScheme === "dark" ? 1 : 0)
  ).current;
  const prevScheme = useRef(actualColorScheme);

  // Animated value for tab content fade
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevTab = useRef(currentTab);

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

  // Animate fade on tab change
  useEffect(() => {
    if (prevTab.current !== currentTab) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
      prevTab.current = currentTab;
    }
  }, [currentTab]);

  // Interpolate background color
  const backgroundColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.light.background, Colors.dark.background],
  });

  if (!fontsLoaded) {
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

  return (
    <Animated.View style={{ flex: 1, backgroundColor }}>
      <FontTextContext.Provider value={{ fontFamily: "Poppins-Regular" }}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <Tabs
            screenOptions={{
              headerShown: false,
            }}
            tabBar={() => <CustomTabBar />}
            initialRouteName="home"
          >
            <Tabs.Screen name="home" options={{ title: "Home" }} />
            <Tabs.Screen name="pdfs" options={{ title: "PDFs" }} />
            <Tabs.Screen name="settings" options={{ title: "Settings" }} />
            <Tabs.Screen
              name="camera"
              options={{ title: "Camera", tabBarStyle: { display: "none" } }}
            />
            <Tabs.Screen
              name="image-to-pdf"
              options={{
                title: "Image to PDF",
                tabBarStyle: { display: "none" },
              }}
            />
            <Tabs.Screen
              name="compress-pdf"
              options={{
                title: "Compress PDF",
                tabBarStyle: { display: "none" },
              }}
            />
          </Tabs>
        </Animated.View>
      </FontTextContext.Provider>
    </Animated.View>
  );
}
