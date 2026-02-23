/**
 * Custom Button component
 * Min 48px touch target for accessibility
 */

import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  type TouchableOpacityProps,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, BorderRadius, Fonts, Spacing, Shadows } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LiquidGlass } from "@/components/ui/liquid-glass";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const getTextColor = () => {
    if (disabled) return colors.textMuted;
    switch (variant) {
      case "primary":
      case "secondary":
        return colors.onPrimary;
      case "outline":
        return colors.primary;
      case "ghost":
        return colors.textMuted;
      default:
        return colors.onPrimary;
    }
  };

  const getBorderColor = () => {
    if (variant === "outline") {
      return disabled ? colors.border : colors.primary;
    }
    return "transparent";
  };

  const getPadding = () => {
    switch (size) {
      case "sm":
        return { paddingVertical: 10, paddingHorizontal: Spacing.md };
      case "lg":
        return { paddingVertical: 15, paddingHorizontal: Spacing.lg };
      default:
        return { paddingVertical: 12, paddingHorizontal: Spacing.lg };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case "sm":
        return 15;
      case "lg":
        return 18;
      default:
        return 16;
    }
  };

  return (
    <TouchableOpacity
      style={[
        fullWidth && styles.fullWidth,
        !disabled && variant === "primary" && Shadows.sm,
        { minHeight: 48 },
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      {...props}
    >
      {variant === "primary" || variant === "secondary" ? (
        <LinearGradient
          colors={
            disabled
              ? [colors.border, colors.border]
              : variant === "primary"
                ? [colors.primary, colors.primaryLight]
                : [colors.secondary, colors.secondaryLight]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.button,
            styles.gradientButton,
            { ...getPadding() },
            fullWidth && styles.fullWidth,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={getTextColor()} size="small" />
          ) : (
            <Text
              style={[
                styles.text,
                {
                  color: getTextColor(),
                  fontSize: getFontSize(),
                },
              ]}
            >
              {title}
            </Text>
          )}
        </LinearGradient>
      ) : (
        <LiquidGlass
          style={[
            styles.button,
            {
              borderColor: getBorderColor(),
              borderWidth: variant === "outline" ? 1 : 0,
              ...getPadding(),
            },
            fullWidth && styles.fullWidth,
          ]}
        >
          <View style={styles.centered}>
            {loading ? (
              <ActivityIndicator color={getTextColor()} size="small" />
            ) : (
              <Text
                style={[
                  styles.text,
                  {
                    color: getTextColor(),
                    fontSize: getFontSize(),
                  },
                ]}
              >
                {title}
              </Text>
            )}
          </View>
        </LiquidGlass>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    overflow: "hidden",
    minHeight: 48,
  },
  gradientButton: {
    borderWidth: 0,
  },
  fullWidth: {
    width: "100%",
  },
  centered: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontFamily: Fonts.semibold,
    textAlign: "center",
  },
});
