import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { ActivityIndicator, Image, Share, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import type { Database } from "@tapit/types";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
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
  const [loading, setLoading] = useState(true);

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
        .then(({ data }) => {
          setProfile(data);
          setLoading(false);
        });
    }, [session]),
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#4f46e5" />
      </SafeAreaView>
    );
  }

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
        <View className="h-24 w-24 items-center justify-center rounded-full bg-neutral-200">
          <Ionicons name="person" size={36} color="#9ca3af" />
        </View>
      )}
      <Text className="text-xl font-semibold">{profile.display_name}</Text>
      {profile.designation && <Text className="text-neutral-600">{profile.designation}</Text>}
      {profile.company && <Text className="text-neutral-600">{profile.company}</Text>}
      <Text className="mt-2 rounded-md border border-neutral-200 px-4 py-2 text-sm underline">
        tapit.in/u/{profile.username}
      </Text>

      <View className="mt-4 items-center gap-2">
        <QRCode value={url} size={160} />
        <View className="flex-row items-center gap-1">
          <Ionicons name="qr-code-outline" size={14} color="#9ca3af" />
          <Text className="text-xs text-neutral-400">Scan to open this card</Text>
        </View>
      </View>

      <View className="mt-2 w-full flex-row gap-3">
        <Button icon="share-social-outline" onPress={handleShare} className="flex-1">
          Share
        </Button>
        <Button
          variant="secondary"
          icon="create-outline"
          onPress={() => router.push("/edit-profile")}
          className="flex-1"
        >
          Edit Profile
        </Button>
      </View>
    </SafeAreaView>
  );
}
