/** Doubling cube UI. */

import { View, Text, Modal, Pressable, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, BorderRadius, Fonts, Shadows, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
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
  owner: _owner,
  pendingProposal,
  canPropose,
  currentPlayer,
  onProposeDouble,
  onAcceptDouble,
  onDeclineDouble,
}: DoublingCubeProps) {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const activeColor = currentPlayer === "white" ? colors.primary : colors.accent;
  const isActionable = canPropose && !pendingProposal && !!onProposeDouble;
  const Wrapper = isActionable ? TouchableOpacity : View;
  const wrapperProps = isActionable
    ? {
        onPress: onProposeDouble,
        activeOpacity: 0.7,
        accessibilityRole: "button" as const,
        accessibilityLabel: `Stakes are ${value}. You can raise them now.`,
      }
    : {};

  return (
    <View style={styles.container}>
      <Wrapper {...wrapperProps}>
        <View
          style={[
            styles.tile,
            Shadows.sm,
            {
              backgroundColor: colors.cardBackground,
              borderColor: isActionable ? activeColor : colors.border,
            },
          ]}
        >
          <Text style={[styles.label, { color: colors.textMuted }]}>Stakes</Text>
          <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
          <Text style={[styles.caption, { color: isActionable ? activeColor : colors.textMuted }]}>
            {isActionable ? "Raise" : "Current"}
          </Text>
        </View>
      </Wrapper>

      {/* Double proposal modal */}
      <Modal
        visible={pendingProposal && !!onAcceptDouble && !!onDeclineDouble}
        transparent
        animationType="fade"
        onRequestClose={onDeclineDouble}
      >
        <Pressable style={styles.modalOverlay} onPress={onDeclineDouble}>
          <Pressable>
            <View
              style={[
                styles.proposalModal,
                Shadows.md,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.proposalTitle, { color: colors.text }]}>
                Raise the game to {value * 2} points?
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
                  <Text style={[styles.modalBtnText, { color: colors.primary }]}>Pass</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  tile: {
    width: 76,
    minHeight: 72,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontFamily: Fonts.medium,
  },
  value: {
    fontSize: 24,
    fontFamily: Fonts.bold,
  },
  caption: {
    fontSize: 10,
    fontFamily: Fonts.semibold,
    textAlign: "center",
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
    borderWidth: 1,
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
