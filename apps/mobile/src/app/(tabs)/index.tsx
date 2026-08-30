import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Image, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import type { Database } from "@tapit/types";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// tapit.in is still a placeholder domain (see docs/DECISIONS.md) — swap once real and deployed.
function cardUrl(username: string) {
  return `https://tapit.in/u/${username}`;
}

export default function CardScreen() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  // Refetches whenever this tab regains focus, so edits made on /edit-profile show up
  // immediately on return instead of needing a full app reload.
  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      supabase
        .from("profiles")
        .select("*")
        .eq("owner_id", session.user.id)
        .eq("is_primary", true)
        .maybeSingle()
        .then(({ data }) => setProfile(data));
    }, [session]),
  );

  if (!profile) return null;

  const url = cardUrl(profile.username);

  async function handleShare() {
    // `message` (not `url`) carries the link on Android — RN's Share API ignores `url` there.
    await Share.share({ message: url, url });
  }

  return (
    <SafeAreaView className="flex-1 items-center gap-3 bg-white px-6 pt-12">
      {profile.avatar_url ? (
        <Image source={{ uri: profile.avatar_url }} className="h-24 w-24 rounded-full" />
      ) : (
        <View className="h-24 w-24 rounded-full bg-neutral-200" />
      )}
      <Text className="text-xl font-semibold">{profile.display_name}</Text>
      {profile.designation && <Text className="text-neutral-600">{profile.designation}</Text>}
      {profile.company && <Text className="text-neutral-600">{profile.company}</Text>}
      <Text className="mt-2 rounded-md border border-neutral-200 px-4 py-2 text-sm underline">
        tapit.in/u/{profile.username}
      </Text>

      <View className="mt-4 items-center gap-2">
        <QRCode value={url} size={160} />
        <Text className="text-xs text-neutral-400">Scan to open this card</Text>
      </View>

      <View className="mt-2 w-full flex-row gap-3">
        <Button onPress={handleShare} className="flex-1">
          Share
        </Button>
        <Button variant="secondary" onPress={() => router.push("/edit-profile")} className="flex-1">
          Edit Profile
        </Button>
      </View>
    </SafeAreaView>
  );
}
