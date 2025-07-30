import React from "react";
import { Text, TextProps, Platform } from "react-native";

// Map fontWeight to Poppins font family
function getPoppinsFontFamily(weight: TextProps["style"] | undefined) {
  if (!weight) return "Poppins-Regular";
  if (Array.isArray(weight)) {
    // If style is an array, flatten and check for fontWeight
    const flat = Object.assign({}, ...weight);
    return getPoppinsFontFamily(flat.fontWeight);
  }
  if (typeof weight === "object" && weight.fontWeight) {
    switch (weight.fontWeight) {
      case "bold":
      case "700":
      case "800":
      case "900":
        return "Poppins-Bold";
      case "600":
      case "semibold":
        return "Poppins-SemiBold";
      case "500":
        return "Poppins-Medium";
      case "300":
      case "light":
        return "Poppins-Light";
      default:
        return "Poppins-Regular";
    }
  }
  if (typeof weight === "string") {
    switch (weight) {
      case "bold":
      case "700":
      case "800":
      case "900":
        return "Poppins-Bold";
      case "600":
      case "semibold":
        return "Poppins-SemiBold";
      case "500":
        return "Poppins-Medium";
      case "300":
      case "light":
        return "Poppins-Light";
      default:
        return "Poppins-Regular";
    }
  }
  return "Poppins-Regular";
}

export default function CustomText(props: TextProps) {
  const { style, ...rest } = props;
  const fontFamily = getPoppinsFontFamily(style);
  return <Text {...rest} style={[{ fontFamily }, style]} />;
}
