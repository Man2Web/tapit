import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { colors } from "@/lib/colors";

// Placeholder only — no storefront exists yet. PRODUCT.md §9.1 scopes the actual hardware
// store as an external Shopify/Razorpay page (not an in-app catalog/checkout flow), so this
// tab's eventual content is "link out to that page", not a screen built here from scratch.
export default function ShopScreen() {
  return (
    // Padding lives on this inner View, not the SafeAreaView — see docs/DECISIONS.md
    // (SafeAreaView's inline inset style silently overrides className padding).
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center gap-3 px-6 pt-16">
        <Ionicons name="storefront-outline" size={40} color={colors.muted} />
        <Text variant="h4">Shop</Text>
        <Text variant="muted" className="text-center">
          NFC cards, stands, and more — coming soon.
        </Text>
      </View>
    </SafeAreaView>
  );
}
