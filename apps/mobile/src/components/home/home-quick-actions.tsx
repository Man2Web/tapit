import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { colors } from "@/lib/colors";

type QuickAction = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
};

type HomeQuickActionsProps = {
  actions: QuickAction[];
};

/**
 * Compact row of quick action buttons.
 * No colored icon backgrounds. Just icon + label in a clean bordered container.
 */
export function HomeQuickActions({ actions }: HomeQuickActionsProps) {
  return (
    <View className="w-full flex-row gap-2">
      {actions.map((action) => (
        <Pressable
          key={action.label}
          onPress={action.onPress}
          className="flex-1 items-center gap-1.5 rounded-lg border border-border bg-card py-3 active:bg-secondary"
        >
          <Ionicons name={action.icon} size={20} color={colors.foreground} />
          <Text className="text-[11px] font-medium text-foreground">
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
