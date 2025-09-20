import { Platform as RNPlatform, Dimensions } from "react-native";

export const Platform = {
  ...RNPlatform,
  isIOS: RNPlatform.OS === "ios",
  isAndroid: RNPlatform.OS === "android",
  isWeb: RNPlatform.OS === "web",
  isMobile: RNPlatform.OS === "ios" || RNPlatform.OS === "android",
};

const { width, height } = Dimensions.get("window");

export const Screen = {
  width,
  height,
  isTablet: Platform.isIOS ? false : width >= 768, // Note: isPad detection requires expo-device
  isSmall: width < 375,
  isLarge: width >= 414,
};

export const Styling = {
  // Platform-specific spacing
  spacing: {
    xs: Platform.isIOS ? 4 : 4,
    sm: Platform.isIOS ? 8 : 6,
    md: Platform.isIOS ? 16 : 14,
    lg: Platform.isIOS ? 24 : 20,
    xl: Platform.isIOS ? 32 : 28,
  },

  // Platform-specific border radius
  borderRadius: {
    sm: Platform.isIOS ? 8 : 6,
    md: Platform.isIOS ? 12 : 8,
    lg: Platform.isIOS ? 16 : 12,
    xl: Platform.isIOS ? 20 : 16,
  },

  // Platform-specific shadows
  shadow: Platform.isIOS
    ? {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      }
    : {
        elevation: 4,
      },

  // Platform-specific font weights
  fontWeight: {
    regular: Platform.isIOS ? ("400" as const) : ("normal" as const),
    medium: Platform.isIOS ? ("500" as const) : ("600" as const),
    semibold: Platform.isIOS ? ("600" as const) : ("700" as const),
    bold: Platform.isIOS ? ("700" as const) : ("bold" as const),
  },
};
