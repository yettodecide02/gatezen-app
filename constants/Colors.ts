/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = "#0a7ea4";
// Dark mode uses only neutral greys
const tintColorDark = "#D4D4D4";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#E5E5E5",
    background: "#121212",
    tint: tintColorDark,
    icon: "#A3A3A3",
    tabIconDefault: "#A3A3A3",
    tabIconSelected: tintColorDark,
  },
};
