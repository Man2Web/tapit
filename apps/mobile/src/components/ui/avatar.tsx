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
  zoom?: number;
  panX?: number;
  panY?: number;
  rotation?: number;
  aspectMask?: string;
  colorFilter?: string;
};

/**
 * Professional Profile Picture & Avatar Component
 * - Un-shifted default: Renders cleanly centered ('cover') with zero artificial clipping.
 * - Supports custom user studio adjustments (zoom, panX, panY, rotation, aspectMask, colorFilter).
 */
export function Avatar({
  uri,
  size = 96,
  fallbackIcon = "person-outline",
  onPress,
  className,
  showEditBadge = false,
  focusMode = "center",
  zoom,
  panX,
  panY,
  rotation,
  aspectMask = "circle",
  colorFilter = "normal",
}: AvatarProps) {
  const Container = onPress ? Pressable : View;
  const radius =
    aspectMask === "square"
      ? size * 0.2
      : aspectMask === "squircle"
      ? size * 0.35
      : size / 2;

  const badgeSize = Math.max(26, size * 0.3);

  // Proportional gesture transform scaling relative to 280px editor viewport
  const ratio = size / 280;
  let scale = typeof zoom === "number" && zoom > 0 ? zoom : 1.0;
  let translateX = typeof panX === "number" ? panX * ratio : 0;
  let translateY = typeof panY === "number" ? panY * ratio : 0;
  const rotDeg = typeof rotation === "number" ? rotation : 0;
  let resizeMode: "cover" | "contain" = "cover";

  if (focusMode === "head" && !zoom && !panY) {
    // Subtle head adjustment (only if custom panY is not provided)
    scale = 1.05;
    translateY = -size * 0.05;
    resizeMode = "cover";
  } else if (focusMode === "fit") {
    // Show 100% of photo with zero clipping
    scale = 1.0;
    translateX = 0;
    translateY = 0;
    resizeMode = "contain";
  }

  // Filter overlay tint style
  const filterOverlayStyle =
    colorFilter === "mono"
      ? "bg-slate-900/60 saturate-0"
      : colorFilter === "warm"
      ? "bg-amber-950/20"
      : colorFilter === "cool"
      ? "bg-sky-950/20"
      : "bg-transparent";

  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      className={cn("relative items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* Outer Frame */}
      <View
        className="items-center justify-center overflow-hidden bg-muted/60 shadow-md border-2 border-primary/20 relative"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
        }}
      >
        {uri ? (
          <>
            <Image
              source={{ uri }}
              style={{
                width: size,
                height: size,
                borderRadius: radius,
                transform: [
                  { scale },
                  { translateX },
                  { translateY },
                  { rotate: `${rotDeg}deg` },
                ],
              }}
              resizeMode={resizeMode}
            />
            {colorFilter !== "normal" && (
              <View className={`absolute inset-0 pointer-events-none ${filterOverlayStyle}`} />
            )}
          </>
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
