import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function NotFoundRoute() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        backgroundColor: "#07141f",
      }}
    >
      <Text selectable style={{ color: "white", fontSize: 24, fontWeight: "700" }}>
        Route not found
      </Text>
      <Link href="/" asChild>
        <Pressable
          accessibilityRole="button"
          style={{ backgroundColor: "#2dd4bf", borderRadius: 999, padding: 14 }}
        >
          <Text style={{ color: "#052e2b", fontWeight: "700" }}>Return to capture</Text>
        </Pressable>
      </Link>
    </View>
  );
}
