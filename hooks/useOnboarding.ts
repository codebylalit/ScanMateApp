import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export function useOnboarding() {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<
    boolean | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const status = await AsyncStorage.getItem("onboardingCompleted");
      setIsOnboardingCompleted(status === "true");
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      setIsOnboardingCompleted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const markOnboardingCompleted = async () => {
    try {
      await AsyncStorage.setItem("onboardingCompleted", "true");
      setIsOnboardingCompleted(true);
    } catch (error) {
      console.error("Error marking onboarding as completed:", error);
    }
  };

  const resetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem("onboardingCompleted");
      setIsOnboardingCompleted(false);
    } catch (error) {
      console.error("Error resetting onboarding:", error);
    }
  };

  return {
    isOnboardingCompleted,
    isLoading,
    markOnboardingCompleted,
    resetOnboarding,
  };
}
