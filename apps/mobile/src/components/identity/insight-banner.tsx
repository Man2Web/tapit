import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { colors } from "@/lib/colors";

type InsightBannerProps = {
  viewsCount?: number;
};

export function InsightBanner({ viewsCount = 0 }: InsightBannerProps) {
  return (
    <Pressable
      onPress={() => router.push("/insights")}
      className="w-full max-w-[350px] flex-row items-center justify-between rounded-2xl border border-border/50 bg-accent/40 px-4 py-3 active:bg-accent/70"
    >
      <View className="flex-row items-center gap-2 flex-1 mr-2">
        <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
        <Text className="text-xs font-medium text-foreground" numberOfLines={1}>
          {viewsCount > 0
            ? `${viewsCount} people viewed your identity pass`
            : "Identity pass is active & ready to share"}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={14} color={colors.muted} />
    </Pressable>
  );
}
