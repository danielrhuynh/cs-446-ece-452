import { useEffect } from "react";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import * as SplashScreen from "expo-splash-screen";
import "react-native-reanimated";

import { SafeAreaProvider } from "react-native-safe-area-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, Fonts } from "@/constants/theme";

// Keep the splash screen visible while we fetch resources
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  // Custom theme
  const customTheme = {
    ...(colorScheme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      card: colors.header,
      background: "transparent",
    },
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider value={customTheme}>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.header,
            },
            headerTintColor: colors.text,
            headerTitleStyle: {
              fontFamily: Fonts.semibold,
              fontSize: 17,
            },
            headerShadowVisible: false,
            headerBlurEffect: colorScheme === "dark" ? "dark" : "light",
            headerTransparent: true,
            contentStyle: { backgroundColor: "transparent" },
            animation: "default",
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="create"
            options={{
              title: "Create Game",
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="join"
            options={{
              title: "Join Game",
              headerBackTitle: "Home",
            }}
          />
          <Stack.Screen
            name="tutorial"
            options={{
              title: "Backgammon Tutorial",
              headerShown: false,
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="lobby"
            options={{
              headerShown: false,
              gestureEnabled: false,
              animation: "fade",
            }}
          />
          <Stack.Screen
            name="game"
            options={{
              title: "",
              headerShown: false,
              gestureEnabled: false,
              animation: "fade",
            }}
          />
        </Stack>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
