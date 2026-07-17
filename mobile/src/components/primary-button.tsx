import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";

import { colors } from "@/theme/colors";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  busy?: boolean;
  icon?: ReactNode;
  variant?: "primary" | "secondary";
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  busy = false,
  icon,
  variant = "primary",
}: PrimaryButtonProps) {
  const blocked = disabled || busy;
  const primary = variant === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 999,
        borderWidth: primary ? 0 : 1,
        borderColor: colors.border,
        backgroundColor: primary ? colors.accent : colors.surfaceRaised,
        opacity: blocked ? 0.45 : pressed ? 0.75 : 1,
        paddingHorizontal: 18,
        paddingVertical: 12,
      })}
    >
      {busy ? <ActivityIndicator color={primary ? colors.accentInk : colors.ink} /> : icon}
      <Text
        style={{
          color: primary ? colors.accentInk : colors.ink,
          fontSize: 16,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
