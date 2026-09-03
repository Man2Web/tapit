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

// House pattern (§13.1a): iOS Inset Grouped list row component with perfect alignment
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
    <View className={cn("bg-card", showDivider && "border-b border-border/40", className)}>
      <Container
        onPress={onPress}
        accessibilityRole={onPress ? "button" : undefined}
        className={cn("min-h-[52px] flex-row items-center gap-3.5 px-4 py-3.5", onPress && "active:bg-accent/60")}
      >
        {leading}
        <View className="flex-1 min-w-0">
          <Text className="text-sm font-semibold tracking-tight text-foreground" numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text className="mt-0.5 text-xs text-muted-foreground leading-normal" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        {trailing}
      </Container>
      {footer && <View className="px-4 pb-3.5 pt-0.5">{footer}</View>}
    </View>
  );
}
