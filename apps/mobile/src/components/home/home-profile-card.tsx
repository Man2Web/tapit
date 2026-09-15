import { Share, View } from "react-native";
import { router } from "expo-router";
import type { Database } from "@tapit/types";
import { Avatar, type AvatarFocusMode } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || "https://tapit.man2web.in";

type HomeProfileCardProps = {
  profile: Profile;
  focusMode?: AvatarFocusMode;
};

/**
 * Compact profile card for the Home screen.
 * Shows avatar, name, title, company, profile URL, and primary actions.
 */
export function HomeProfileCard({ profile, focusMode = "center" }: HomeProfileCardProps) {
  const themeObj = (profile.theme ?? {}) as Record<string, unknown>;
  const zoom = typeof themeObj.avatar_zoom === "number" ? themeObj.avatar_zoom : undefined;
  const panX = typeof themeObj.avatar_pan_x === "number" ? themeObj.avatar_pan_x : undefined;
  const panY = typeof themeObj.avatar_pan_y === "number" ? themeObj.avatar_pan_y : undefined;
  const rotation = typeof themeObj.avatar_rotation === "number" ? themeObj.avatar_rotation : undefined;
  const aspectMask = typeof themeObj.avatar_aspect_mask === "string" ? themeObj.avatar_aspect_mask : undefined;
  const colorFilter = typeof themeObj.avatar_color_filter === "string" ? themeObj.avatar_color_filter : undefined;

  const profileUrl = `${WEB_BASE_URL}/u/${profile.username}`;

  async function handleShare() {
    try {
      await Share.share({
        title: profile.display_name,
        message: `${profile.display_name}: ${profileUrl}`,
        url: profileUrl,
      });
    } catch {
      // User cancelled
    }
  }

  return (
    <View className="w-full rounded-lg border border-border bg-card p-4">
      {/* Profile info row */}
      <View className="flex-row items-center gap-3.5">
        <Avatar
          uri={profile.avatar_url}
          size={56}
          focusMode={focusMode}
          zoom={zoom}
          panX={panX}
          panY={panY}
          rotation={rotation}
          aspectMask={aspectMask}
          colorFilter={colorFilter}
        />
        <View className="flex-1 min-w-0 gap-0.5">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
            {profile.display_name}
          </Text>
          {(profile.designation || profile.company) && (
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {profile.designation}
              {profile.designation && profile.company ? " · " : ""}
              {profile.company}
            </Text>
          )}
          <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
            {WEB_BASE_URL.replace("https://", "")}/u/{profile.username}
          </Text>
        </View>

        {/* Active status */}
        {profile.is_active !== false && (
          <View className="flex-row items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 border border-emerald-200">
            <View className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <Text className="text-[11px] font-medium text-emerald-700">Active</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View className="flex-row gap-2 mt-4">
        <Button
          onPress={handleShare}
          icon="share-outline"
          className="flex-1 rounded-lg"
        >
          Share Profile
        </Button>
        <Button
          variant="outline"
          onPress={() => router.push("/edit-profile")}
          icon="create-outline"
          className="rounded-lg px-3.5"
        >
          Edit
        </Button>
      </View>
    </View>
  );
}
