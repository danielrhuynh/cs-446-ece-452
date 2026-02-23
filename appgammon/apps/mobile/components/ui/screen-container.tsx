import { StyleSheet, SafeAreaView, type ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Gradients } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
}

export function ScreenContainer({ children, style, ...props }: ScreenContainerProps) {
  const colorScheme = useColorScheme() ?? "light";

  return (
    <SafeAreaView style={[styles.safeArea, style]} {...props}>
      <LinearGradient
        colors={Gradients[colorScheme].background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
