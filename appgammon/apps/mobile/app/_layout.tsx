import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  // Custom theme with purple header
  const customTheme = {
    ...(colorScheme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      card: colors.header,
    },
  };

  return (
    <ThemeProvider value={customTheme}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.header,
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "600",
          },
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
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="join"
          options={{
            title: "Join Game",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="lobby"
          options={{
            title: "",
            headerLeft: () => null,
            gestureEnabled: false,
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
