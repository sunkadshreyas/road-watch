import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";

import { colors } from "@/theme/colors";

type ScreenShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}>;

export function ScreenShell({
  eyebrow,
  title,
  description,
  action,
  children,
}: ScreenShellProps) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ gap: 20, padding: 20, paddingBottom: 40 }}
    >
      <View style={{ gap: 8 }}>
        <Text
          selectable
          style={{
            color: colors.accent,
            fontSize: 12,
            fontWeight: "800",
            letterSpacing: 1.6,
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </Text>
        <Text selectable style={{ color: colors.ink, fontSize: 32, fontWeight: "800" }}>
          {title}
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 16, lineHeight: 23 }}>
          {description}
        </Text>
        {action}
      </View>
      {children}
    </ScrollView>
  );
}
