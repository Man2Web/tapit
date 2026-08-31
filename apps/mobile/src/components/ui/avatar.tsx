import type { ComponentProps } from "react";
import { Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "@/lib/utils";
import { colors } from "@/lib/colors";

type AvatarProps = {
  uri?: string | null;
  size?: number;
  fallbackIcon?: ComponentProps<typeof Ionicons>["name"];
  onPress?: () => void;
  className?: string;
};

// House pattern: the photo circle used on onboarding, edit-profile, and the Card tab — was
// three near-identical hand-rolled `Image` + fallback `View`/`Ionicons` blocks before this.
export function Avatar({ uri, size = 96, fallbackIcon = "person", onPress, className }: AvatarProps) {
  const Container = onPress ? Pressable : View;
  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      className={cn("items-center justify-center overflow-hidden rounded-full bg-muted", className)}
      style={{ width: size, height: size }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} />
      ) : (
        <Ionicons name={fallbackIcon} size={size * 0.375} color={colors.muted} />
      )}
    </Container>
  );
}
