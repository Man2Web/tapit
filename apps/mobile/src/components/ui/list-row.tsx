import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { cn } from "@/lib/utils";

type ListRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Extra content rendered below the row, inside the same container */
  footer?: ReactNode;
  onPress?: () => void;
  className?: string;
  showDivider?: boolean;
};

// House pattern (§13.1a): iOS Inset Grouped list row component
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  footer,
  onPress,
  className,
  showDivider = false,
}: ListRowProps) {
  const Container = onPress ? Pressable : View;

  return (
    <View className={cn("bg-card", showDivider && "border-b border-border/50", className)}>
      <Container
        onPress={onPress}
        accessibilityRole={onPress ? "button" : undefined}
        className={cn("min-h-[48px] flex-row items-center gap-3.5 px-4 py-3.5", onPress && "active:bg-accent/60")}
      >
        {leading}
        <View className="flex-1">
          <Text className="text-base font-semibold tracking-tight text-foreground">{title}</Text>
          {subtitle && <Text className="mt-0.5 text-xs text-muted-foreground">{subtitle}</Text>}
        </View>
        {trailing}
      </Container>
      {footer && <View className="px-4 pb-3">{footer}</View>}
    </View>
  );
}
