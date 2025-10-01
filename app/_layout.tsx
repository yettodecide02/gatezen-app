import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { View, Platform } from "react-native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/useColorScheme";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const LightNavTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: "#ffffff",
      card: "#ffffff",
    },
  } as const;
  const DarkNavTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: "#000000",
      card: "#000000",
      border: "#111111",
      text: "#ffffff",
    },
  } as const;
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <SafeAreaProvider>
      <View
        style={{
          flex: 1,
          backgroundColor: colorScheme === "dark" ? "#000" : "#fff",
        }}
      >
        <ThemeProvider
          value={colorScheme === "dark" ? DarkNavTheme : LightNavTheme}
        >
          <Stack
            initialRouteName="login"
            screenOptions={{
              headerShown: false,
              animation: Platform.OS === "ios" ? "slide_from_right" : "fade",
              contentStyle: {
                backgroundColor: (colorScheme === "dark"
                  ? "#000"
                  : "#fff") as any,
              },
            }}
          >
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="gatekeeper" />
            <Stack.Screen name="auth/callback" />
          </Stack>
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        </ThemeProvider>
      </View>
    </SafeAreaProvider>
  );
}
