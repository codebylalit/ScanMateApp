import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextProps {
  themeMode: ThemeMode;
  actualColorScheme: "light" | "dark";
  isLoading: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        const savedThemeMode = await AsyncStorage.getItem("themeMode");
        if (
          savedThemeMode &&
          ["light", "dark", "system"].includes(savedThemeMode)
        ) {
          setThemeMode(savedThemeMode as ThemeMode);
        }
      } catch (error) {
        console.log("Error loading theme mode:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadThemeMode();
  }, []);

  const saveThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem("themeMode", mode);
      setThemeMode(mode);
    } catch (error) {
      console.log("Error saving theme mode:", error);
    }
  };

  const getActualColorScheme = (): "light" | "dark" => {
    if (themeMode === "system") {
      return systemColorScheme ?? "light";
    }
    return themeMode;
  };

  const toggleTheme = () => {
    if (themeMode === "system") {
      saveThemeMode("light");
    } else if (themeMode === "light") {
      saveThemeMode("dark");
    } else {
      saveThemeMode("light");
    }
  };

  const setTheme = (mode: ThemeMode) => {
    saveThemeMode(mode);
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        actualColorScheme: getActualColorScheme(),
        isLoading,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
