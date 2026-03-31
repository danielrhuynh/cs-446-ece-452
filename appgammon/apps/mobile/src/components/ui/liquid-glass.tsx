import { Platform, View, StyleSheet, type ViewProps } from "react-native";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface LiquidGlassProps extends ViewProps {
  glassEffectStyle?: "regular" | "clear";
}

export function LiquidGlass({
  children,
  glassEffectStyle = "regular",
  style,
  ...props
}: LiquidGlassProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const hasNativeGlass =
    Platform.OS === "ios" && (isGlassEffectAPIAvailable() || isLiquidGlassAvailable());

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: colors.glassBorder,
          backgroundColor: hasNativeGlass ? "transparent" : colors.glassBackground,
        },
        style,
      ]}
      {...props}
    >
      {hasNativeGlass ? (
        <GlassView
          style={StyleSheet.absoluteFill}
          glassEffectStyle={glassEffectStyle}
          tintColor={colorScheme === "dark" ? "rgba(40,36,32,0.3)" : "rgba(255,252,245,0.2)"}
        />
      ) : (
        <LinearGradient
          colors={
            colorScheme === "dark"
              ? ["rgba(255,248,235,0.06)", "rgba(255,248,235,0.01)"]
              : [colors.glassHighlight, "rgba(255,252,245,0.15)"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
  },
});
