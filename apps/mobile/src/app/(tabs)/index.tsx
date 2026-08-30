import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Image, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Database } from "@tapit/types";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

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

      <Button variant="secondary" onPress={() => router.push("/edit-profile")} className="mt-2">
        Edit Profile
      </Button>
    </SafeAreaView>
  );
}
