import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { colors } from "@/lib/colors";

type Status = "idle" | "checking" | "available" | "taken" | "invalid";

type UsernameStatusProps = {
  status: Status;
  reason?: string | null;
};

// Shared between onboarding step 3 and edit-profile's username field — both run the same
// debounced is_username_available check and rendered this identically before this component.
export function UsernameStatus({ status, reason }: UsernameStatusProps) {
  if (status === "idle") return null;

  if (status === "checking") {
    return <Text className="text-sm text-muted-foreground">Checking…</Text>;
  }

  if (status === "available") {
    return (
      <View className="flex-row items-center gap-1.5">
        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        <Text className="text-sm text-success">Available</Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-1.5">
      <Ionicons name="alert-circle" size={16} color={colors.danger} />
      <Text className="text-sm text-danger">{reason}</Text>
    </View>
  );
}
