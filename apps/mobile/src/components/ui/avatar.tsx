import type { ComponentProps } from "react";
import { Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "@/lib/utils";
import { colors } from "@/lib/colors";

export type AvatarFocusMode = "head" | "center" | "fit";

type AvatarProps = {
  uri?: string | null;
  size?: number;
  fallbackIcon?: ComponentProps<typeof Ionicons>["name"];
  onPress?: () => void;
  className?: string;
  showEditBadge?: boolean;
  focusMode?: AvatarFocusMode;
  offsetY?: number;
};

/**
 * Professional Profile Picture & Avatar Component
 * Supports `focusMode`:
 * - 'head': Shifts photo UP (-12%) so top of head & face are 100% framed in circle (never cut off).
 * - 'fit': Uses `contain` mode so 100% of photo is shown without any cutoffs.
 * - 'center': Standard centered `cover` crop.
 */
export function Avatar({
  uri,
  size = 96,
  fallbackIcon = "person-outline",
  onPress,
  className,
  showEditBadge = false,
  focusMode = "head",
  offsetY = 0,
}: AvatarProps) {
  const Container = onPress ? Pressable : View;
  const radius = size / 2;
  const badgeSize = Math.max(26, size * 0.3);

  let scale = 1.0;
  let translateY = 0;
  let resizeMode: "cover" | "contain" = "cover";

  if (focusMode === "head") {
    // Shift UP so head, hair, and face are centered and never cut off at the top
    scale = 1.12;
    translateY = -size * 0.12;
    resizeMode = "cover";
  } else if (focusMode === "fit") {
    // Show 100% of photo with zero clipping
    scale = 1.0;
    translateY = 0;
    resizeMode = "contain";
  } else if (typeof offsetY === "number" && offsetY !== 0) {
    scale = 1.15;
    translateY = (offsetY / 100) * (size * 0.3);
    resizeMode = "cover";
  } else {
    scale = 1.0;
    translateY = 0;
    resizeMode = "cover";
  }

  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      className={cn("relative items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* Outer Circle Frame */}
      <View
        className="items-center justify-center overflow-hidden bg-muted/60 shadow-md border-2 border-primary/20"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
        }}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{
              width: size,
              height: size,
              borderRadius: radius,
              transform: [{ scale }, { translateY }],
            }}
            resizeMode={resizeMode}
          />
        ) : (
          <View className="items-center justify-center w-full h-full bg-primary/10">
            <Ionicons name={fallbackIcon} size={size * 0.4} color={colors.primary} />
          </View>
        )}
      </View>

      {/* Edit Camera Badge Overlay */}
      {showEditBadge && (
        <View
          className="absolute bottom-0 right-0 items-center justify-center rounded-full bg-primary border-2 border-background shadow-md"
          style={{ width: badgeSize, height: badgeSize }}
        >
          <Ionicons name="camera" size={badgeSize * 0.55} color="#ffffff" />
        </View>
      )}
    </Container>
  );
}
