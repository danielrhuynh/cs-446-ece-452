/**
 * Theme constants for Appgammon
 * Colors are based on the wireframe designs
 */

import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#11181C",
    textMuted: "#687076",
    background: "#fff",
    tint: "#5BA4E8",
    icon: "#687076",
    // App-specific colors from wireframes
    primary: "#5BA4E8", // Blue - Create Game button
    secondary: "#6BCB77", // Green - Join Game button
    accent: "#F9A826", // Orange/Yellow - accent color
    border: "#E0E0E0",
    inputBackground: "#F5F5F5",
    cardBackground: "#FAFAFA",
    // Status colors
    hostBadge: "#6BCB77",
    joinedBadge: "#F9A826",
    // Header
    header: "#B794F6", // Purple header from wireframes
  },
  dark: {
    text: "#ECEDEE",
    textMuted: "#9BA1A6",
    background: "#151718",
    tint: "#5BA4E8",
    icon: "#9BA1A6",
    // App-specific colors
    primary: "#5BA4E8",
    secondary: "#6BCB77",
    accent: "#F9A826",
    border: "#333",
    inputBackground: "#222",
    cardBackground: "#1A1A1A",
    // Status colors
    hostBadge: "#6BCB77",
    joinedBadge: "#F9A826",
    // Header
    header: "#8B5CF6",
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
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
