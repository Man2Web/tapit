import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { cn } from "@/lib/utils";

type ListRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Extra content rendered below the row, inside the same bordered container — e.g. the
   *  value input that appears once a link toggle is switched on. */
  footer?: ReactNode;
  onPress?: () => void;
  className?: string;
};

// House pattern (§13.1a): every other list/settings row in the app should be built on
// this one — e.g. the link toggles in onboarding/edit-profile, settings menu items.
export function ListRow({ title, subtitle, leading, trailing, footer, onPress, className }: ListRowProps) {
  const Container = onPress ? Pressable : View;

  return (
    <View className={cn("rounded-md border border-border bg-card", className)}>
      <Container
        onPress={onPress}
        accessibilityRole={onPress ? "button" : undefined}
        className={cn("min-h-[44px] flex-row items-center gap-3 px-4 py-3", onPress && "active:bg-accent")}
      >
        {leading}
        <View className="flex-1">
          <Text className="text-base font-medium text-foreground">{title}</Text>
          {subtitle && <Text className="text-sm text-muted-foreground">{subtitle}</Text>}
        </View>
        {trailing}
      </Container>
      {footer && <View className="px-4 pb-3">{footer}</View>}
    </View>
  );
}
