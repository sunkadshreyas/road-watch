import type { PropsWithChildren } from "react";
import { Text, View } from "react-native";

import { colors } from "@/theme/colors";

type StatusCardProps = PropsWithChildren<{
  label: string;
  value?: string;
  tone?: "default" | "accent" | "warning";
}>;

export function StatusCard({
  label,
  value,
  tone = "default",
  children,
}: StatusCardProps) {
  const borderColor =
    tone === "accent" ? colors.accent : tone === "warning" ? colors.warning : colors.border;

  return (
    <View
      style={{
        gap: 8,
        borderWidth: 1,
        borderColor,
        borderRadius: 20,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        padding: 16,
      }}
    >
      <Text selectable style={{ color: colors.muted, fontSize: 13, fontWeight: "700" }}>
        {label}
      </Text>
      {value ? (
        <Text
          selectable
          style={{ color: colors.ink, fontSize: 20, fontWeight: "800", fontVariant: ["tabular-nums"] }}
        >
          {value}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
