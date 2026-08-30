import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { cn } from "@/lib/utils";

type ListRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  className?: string;
};

// House pattern (§13.1a): every other list/settings row in the app should be built on
// this one — e.g. the starter-link toggles in onboarding, settings menu items.
export function ListRow({ title, subtitle, leading, trailing, onPress, className }: ListRowProps) {
  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      className={cn(
        "min-h-[44px] flex-row items-center gap-3 rounded-md border border-neutral-200 px-4 py-3",
        onPress && "active:bg-neutral-50",
        className,
      )}
    >
      {leading}
      <View className="flex-1">
        <Text className="text-base font-medium text-neutral-950">{title}</Text>
        {subtitle && <Text className="text-sm text-neutral-600">{subtitle}</Text>}
      </View>
      {trailing}
    </Container>
  );
}
