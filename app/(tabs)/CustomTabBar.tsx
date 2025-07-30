import { Colors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useSegments } from "expo-router";
import React from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import CustomText from "../CustomText";

const TABS = [
  { name: "home", icon: "home", label: "Home" },
  { name: "pdfs", icon: "grid-view", label: "PDFs" },
  { name: "settings", icon: "person", label: "Profile" },
];

export default function CustomTabBar() {
  const { actualColorScheme } = useTheme();
  const theme = Colors[actualColorScheme];
  const router = useRouter();
  const segments = useSegments();
  const current = segments[segments.length - 1];

  // Hide tab bar on screens that don't need it
  const hideTabBarScreens = ["camera", "image-to-pdf", "compress-pdf"];
  if (hideTabBarScreens.includes(current)) {
    return null;
  }

  // Only push the route, no loading overlay
  const handleTabPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={[styles.container]}>
      <View style={[styles.tabBarBg, { backgroundColor: theme.card }]}>
        {TABS.map((tab) => {
          let route = `/${tab.name === "notifications" ? "home" : tab.name}`;
          const isActive =
            current === tab.name ||
            (tab.name === "home" &&
              (current === undefined || current === "(tabs)"));
          return (
            <TouchableOpacity
              key={tab.name}
              style={[
                styles.tabButton,
                isActive && { backgroundColor: theme.cardSmart },
              ]}
              onPress={() => handleTabPress(route)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconLabelWrap]}>
                <MaterialIcons
                  name={tab.icon as any}
                  size={24}
                  color={isActive ? theme.text : theme.muted}
                />
                {isActive && (
                  <CustomText
                    style={[
                      styles.tabLabel,
                      { color: theme.text, fontFamily: "Poppins-SemiBold" },
                    ]}
                  >
                    {" "}
                    {tab.label}{" "}
                  </CustomText>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: Platform.OS === "ios" ? 24 : 24,
    alignItems: "center",
    zIndex: 100,
  },
  tabBarBg: {
    flexDirection: "row",
    borderRadius: 32,
    paddingHorizontal: 2,
    paddingVertical: 2,
    alignItems: "center",
    minWidth: 260,
    elevation: 20,
    borderWidth: 0.1,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 32,
  },
  iconLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 32,
  },
  tabLabel: {
    fontSize: 15,
    marginTop: 3,
  },
});
