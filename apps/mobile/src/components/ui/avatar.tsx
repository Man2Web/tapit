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
  offsetY?: number;
};

// House pattern: the photo circle used on onboarding, edit-profile, and the Card tab — supports
// optional `offsetY` (-50 to 50) so users can manually adjust vertical photo alignment.
export function Avatar({
  uri,
  size = 96,
  fallbackIcon = "person",
  onPress,
  className,
  offsetY = 0,
}: AvatarProps) {
  const Container = onPress ? Pressable : View;
  const radius = size / 2;
  const shift = (offsetY / 100) * (size * 0.4);

  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      className={cn("items-center justify-center overflow-hidden bg-muted relative", className)}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            transform: [{ translateY: shift }],
          }}
          resizeMode="cover"
        />
      ) : (
        <Ionicons name={fallbackIcon} size={size * 0.375} color={colors.muted} />
      )}
    </Container>
  );
}
