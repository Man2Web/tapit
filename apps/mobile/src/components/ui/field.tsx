import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";

// House pattern: a persistent label above its input, instead of relying on placeholder text
// alone — a placeholder disappears the moment the field has a value, so a filled-in form
// loses all context about which field is which. Generalizes the "Profile link" label that
// already existed ad hoc in edit-profile.
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      {children}
    </View>
  );
}
