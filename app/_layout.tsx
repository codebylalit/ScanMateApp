import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="home" options={{ title: "Home" }} />
      <Stack.Screen name="camera" options={{ title: "Scan Document" }} />
      <Stack.Screen name="imagePreview" options={{ title: "Edit Scan" }} />
      <Stack.Screen name="pdfExport" options={{ title: "Export PDF" }} />
      <Stack.Screen name="login" options={{ title: "Login" }} />
    </Stack>
  );
}
