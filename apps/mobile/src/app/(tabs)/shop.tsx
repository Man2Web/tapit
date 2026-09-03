import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { colors } from "@/lib/colors";

type Product = {
  id: string;
  name: string;
  badge: string;
  tagline: string;
  price: string;
  material: string;
  colorBg: string;
  textColor: string;
  icon: string;
  features: string[];
};

const PRODUCTS: Product[] = [
  {
    id: "metal-executive",
    name: "Executive Matte Titanium NFC Card",
    badge: "Most Popular",
    tagline: "Ultra-premium laser-engraved stainless titanium with high-grade NTAG216 chip.",
    price: "$49",
    material: "Solid Stainless Steel",
    colorBg: "bg-slate-900 border-slate-700",
    textColor: "text-white",
    icon: "card",
    features: ["Laser-etched QR code", "Unlimited NFC taps", "Lifetime guarantee"],
  },
  {
    id: "bamboo-eco",
    name: "Natural Eco Bamboo NFC Card",
    badge: "Eco-Friendly",
    tagline: "Handcrafted organic bamboo wood with minimalist rounded edges.",
    price: "$34",
    material: "100% Organic Bamboo",
    colorBg: "bg-amber-900/90 border-amber-700",
    textColor: "text-amber-100",
    icon: "leaf",
    features: ["Natural wood grain", "Biodegradable body", "Custom logo engraving"],
  },
  {
    id: "smart-badge",
    name: "Tapit NFC Executive Phone Tag",
    badge: "Compact",
    tagline: "Glossy 3M adhesive NFC badge for the back of any iPhone or Android.",
    price: "$19",
    material: "Polycarbonate Glass",
    colorBg: "bg-indigo-950 border-indigo-800",
    textColor: "text-indigo-100",
    icon: "hardware-chip",
    features: ["3M residue-free adhesive", "Waterproof IP68", "Instant tap & share"],
  },
];

export default function ShopScreen() {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  function handleOrder(product: Product) {
    setSelectedProduct(product.id);
    Alert.alert(
      `Order ${product.name}`,
      `Would you like to visit the official Tapit Store to order your custom ${product.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Visit Store",
          onPress: () => {
            Linking.openURL("https://tapit.man2web.in");
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-5 pb-10 pt-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="gap-1">
          <View className="flex-row items-center justify-between">
            <Text variant="h2" className="text-2xl font-bold tracking-tight text-foreground">
              Hardware Store
            </Text>
            <View className="rounded-full bg-primary/10 px-3 py-1 border border-primary/20">
              <Text className="text-xs font-bold text-primary">Official Gear</Text>
            </View>
          </View>
          <Text variant="muted" className="text-sm">
            Elevate your networking with authentic Apple HIG custom NFC cards and tags.
          </Text>
        </View>

        {/* Product Cards */}
        <View className="gap-5">
          {PRODUCTS.map((product) => (
            <Card
              key={product.id}
              className="overflow-hidden rounded-3xl border border-border/60 p-0 shadow-md bg-card"
            >
              {/* Product Visual Banner */}
              <View className={`h-40 w-full ${product.colorBg} p-5 justify-between border-b`}>
                <View className="flex-row items-center justify-between">
                  <View className="rounded-full bg-white/20 px-3 py-1 backdrop-blur-md">
                    <Text className="text-[11px] font-bold text-white uppercase tracking-wider">
                      {product.badge}
                    </Text>
                  </View>
                  <Ionicons name={product.icon as any} size={28} color="white" />
                </View>

                <View className="gap-1">
                  <Text className={`text-xl font-bold ${product.textColor}`}>{product.name}</Text>
                  <Text className={`text-xs opacity-80 ${product.textColor}`}>{product.material}</Text>
                </View>
              </View>

              {/* Product Details */}
              <View className="gap-4 p-5">
                <Text className="text-sm text-muted-foreground leading-relaxed">
                  {product.tagline}
                </Text>

                {/* Features list */}
                <View className="gap-2">
                  {product.features.map((feat) => (
                    <View key={feat} className="flex-row items-center gap-2">
                      <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                      <Text className="text-xs font-medium text-foreground">{feat}</Text>
                    </View>
                  ))}
                </View>

                {/* Price & Order CTA */}
                <View className="flex-row items-center justify-between border-t border-border/40 pt-4 mt-1">
                  <View>
                    <Text className="text-xs font-medium text-muted-foreground">Starting at</Text>
                    <Text className="text-2xl font-extrabold text-foreground">{product.price}</Text>
                  </View>

                  <Button
                    icon="bag-check-outline"
                    onPress={() => handleOrder(product)}
                    className="rounded-full px-6 shadow-xs"
                  >
                    Configure & Order
                  </Button>
                </View>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
