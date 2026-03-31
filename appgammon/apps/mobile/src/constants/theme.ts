/** Theme constants for Appgammon. */

import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#1C1917",
    textMuted: "#57534E",
    background: "#FAF7F2",
    icon: "#78716C",
    // Primary green for actions and emphasis.
    primary: "#2D6A4F",
    primaryLight: "#40916C",
    // Secondary amber for accents.
    secondary: "#C4813D",
    secondaryLight: "#D4A373",
    // Accent and status colors.
    accent: "#E76F51",
    error: "#C1121F",
    onPrimary: "#FFFFFF",
    border: "rgba(28,25,23,0.14)",
    inputBackground: "rgba(255,255,255,0.75)",
    cardBackground: "rgba(255,255,255,0.85)",
    // Status colors.
    hostBadge: "#2D6A4F",
    joinedBadge: "#C4813D",
    // Header and glass colors.
    header: "rgba(250,247,242,0.82)",
    glassBorder: "rgba(255,252,245,0.55)",
    glassBackground: "rgba(255,252,245,0.38)",
    glassHighlight: "rgba(255,252,245,0.65)",
  },
  dark: {
    text: "#FAF7F2",
    textMuted: "#A8A29E",
    background: "#1C1917",
    icon: "#A8A29E",
    // Primary green for dark mode.
    primary: "#52B788",
    primaryLight: "#74C69D",
    // Secondary amber for dark mode.
    secondary: "#E6B17E",
    secondaryLight: "#F0C89E",
    // Accent and status colors.
    accent: "#F4845F",
    error: "#F87171",
    onPrimary: "#FFFFFF",
    border: "rgba(250,247,242,0.16)",
    inputBackground: "rgba(40,36,32,0.60)",
    cardBackground: "rgba(40,36,32,0.65)",
    // Status colors.
    hostBadge: "#52B788",
    joinedBadge: "#E6B17E",
    // Header and glass colors.
    header: "rgba(28,25,23,0.60)",
    glassBorder: "rgba(200,190,175,0.22)",
    glassBackground: "rgba(30,27,22,0.40)",
    glassHighlight: "rgba(218,210,195,0.12)",
  },
};

export const Gradients = {
  light: {
    background: ["#FAF7F2", "#F5F1EB", "#FBF8F4"] as const,
  },
  dark: {
    background: ["#1C1917", "#211E1A", "#262220"] as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    display: "Outfit_700Bold",
    displayMedium: "Outfit_600SemiBold",
    sans: "Outfit_400Regular",
    medium: "Outfit_500Medium",
    semibold: "Outfit_600SemiBold",
    bold: "Outfit_700Bold",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    display: "Outfit_700Bold",
    displayMedium: "Outfit_600SemiBold",
    sans: "Outfit_400Regular",
    medium: "Outfit_500Medium",
    semibold: "Outfit_600SemiBold",
    bold: "Outfit_700Bold",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    display: "Outfit, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    displayMedium: "Outfit, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    sans: "Outfit, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    medium: "Outfit, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    semibold: "Outfit, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    bold: "Outfit, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Layout = {
  cardMaxWidth: 400,
  contentMaxWidth: 420,
};

export const Shadows = {
  sm: {
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
};
