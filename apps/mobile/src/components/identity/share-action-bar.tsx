import { Share, View } from "react-native";
import type { Database } from "@tapit/types";
import { Button } from "@/components/ui/button";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || "https://tapit.man2web.in";

type ShareActionBarProps = {
  profile: Profile;
};

export function ShareActionBar({ profile }: ShareActionBarProps) {
  async function handleNativeShare() {
    if (!profile) return;
    const url = `${WEB_BASE_URL}/u/${profile.username}`;
    try {
      await Share.share({
        title: `${profile.display_name} - Digital Identity`,
        message: `Connect with ${profile.display_name}: ${url}`,
        url,
      });
    } catch {
      // Ignored
    }
  }

  return (
    <View className="w-full max-w-[350px] pt-1">
      <Button
        icon="share-outline"
        onPress={handleNativeShare}
        className="w-full py-4 rounded-full shadow-md bg-primary active:bg-primary/90"
      >
        Share Digital Identity
      </Button>
    </View>
  );
}
