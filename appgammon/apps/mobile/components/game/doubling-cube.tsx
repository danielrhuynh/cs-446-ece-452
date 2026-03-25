/**
 * Doubling cube display and propose/accept/decline UI.
 */

import { View, Text, Modal, Pressable, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, BorderRadius, Fonts, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { Button } from "@/components/ui/button";
import type { PlayerColor } from "@/types/game";

interface DoublingCubeProps {
  value: number;
  owner: PlayerColor | null;
  pendingProposal: boolean;
  canPropose: boolean;
  currentPlayer: PlayerColor;
  onProposeDouble?: () => void;
  onAcceptDouble?: () => void;
  onDeclineDouble?: () => void;
}

export function DoublingCube({
  value,
  owner,
  pendingProposal,
  canPropose,
  currentPlayer,
  onProposeDouble,
  onAcceptDouble,
  onDeclineDouble,
}: DoublingCubeProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container}>
      <LiquidGlass
        style={[
          styles.cube,
          {
            borderColor: colors.glassBorder,
          },
        ]}
      >
        <Text style={[styles.value, { color: colors.text }]}>
          {value === 1 ? "1" : value}
        </Text>
      </LiquidGlass>

      {/* Double proposal modal */}
      <Modal
        visible={pendingProposal && !!onAcceptDouble && !!onDeclineDouble}
        transparent
        animationType="fade"
        onRequestClose={onDeclineDouble}
      >
        <Pressable style={styles.modalOverlay} onPress={onDeclineDouble}>
          <Pressable>
            <LiquidGlass
              style={[
                styles.proposalModal,
                { borderColor: colors.glassBorder },
              ]}
            >
              <Text style={[styles.proposalTitle, { color: colors.text }]}>
                Double to {value * 2}?
              </Text>
              <View style={styles.buttons}>
                <TouchableOpacity activeOpacity={0.7} onPress={onAcceptDouble}>
                  <LinearGradient
                    colors={[colors.primary, colors.primaryLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalBtn}
                  >
                    <Text style={[styles.modalBtnText, { color: colors.onPrimary }]}>Accept</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onDeclineDouble}
                  style={[styles.modalBtn, styles.modalBtnOutline, { borderColor: colors.primary }]}
                >
                  <Text style={[styles.modalBtnText, { color: colors.primary }]}>Decline</Text>
                </TouchableOpacity>
              </View>
            </LiquidGlass>
          </Pressable>
        </Pressable>
      </Modal>

      {!pendingProposal && canPropose && onProposeDouble && value === 1 && (
        <Button
          title="Double"
          variant="secondary"
          size="sm"
          onPress={onProposeDouble}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  cube: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  value: {
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  proposalModal: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  proposalTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  buttons: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  modalBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  modalBtnOutline: {
    borderWidth: 1,
  },
  modalBtnText: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
  },
});
