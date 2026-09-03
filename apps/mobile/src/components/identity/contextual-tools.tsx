import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { colors } from "@/lib/colors";

type ContextualToolsProps = {
  onExchange: () => void;
  onScanCard: () => void;
  onCustomize: () => void;
};

export function ContextualTools({
  onExchange,
  onScanCard,
  onCustomize,
}: ContextualToolsProps) {
  return (
    <View className="w-full max-w-[350px] flex-row items-center justify-between gap-2 pt-1">
      <Pressable
        onPress={onExchange}
        className="flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-border/60 bg-card py-3 px-2 shadow-xs active:bg-accent"
      >
        <Ionicons name="people-outline" size={16} color={colors.primary} />
        <Text className="text-xs font-semibold text-foreground">Exchange</Text>
      </Pressable>

      <Pressable
        onPress={onScanCard}
        className="flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-border/60 bg-card py-3 px-2 shadow-xs active:bg-accent"
      >
        <Ionicons name="camera-outline" size={16} color="#10B981" />
        <Text className="text-xs font-semibold text-foreground">Scan Card</Text>
      </Pressable>

      <Pressable
        onPress={onCustomize}
        className="flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-border/60 bg-card py-3 px-2 shadow-xs active:bg-accent"
      >
        <Ionicons name="color-palette-outline" size={16} color="#F59E0B" />
        <Text className="text-xs font-semibold text-foreground">Customize</Text>
      </Pressable>
    </View>
  );
}
