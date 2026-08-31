import { useCallback, useState, type ComponentProps } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  Share,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import type { Database } from "@tapit/types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";
import { supabase } from "@/lib/supabase";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileLink = Database["public"]["Tables"]["profile_links"]["Row"];

// tapit.in is still a placeholder domain (see docs/DECISIONS.md) — swap once real and deployed.
// `source` lets the public page's view-tracker attribute the visit correctly — only the QR
// code should be tagged "qr"; the Share button hands out the plain link.
function cardUrl(username: string, source?: "qr") {
  const base = `https://tapit.in/u/${username}`;
  return source ? `${base}?source=${source}` : base;
}

export default function CardScreen() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (!session) return;
      if (isRefresh) setRefreshing(true);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("owner_id", session.user.id)
        .eq("is_primary", true)
        .maybeSingle();

      if (profileError) {
        // Leaves any previously loaded profile/links in place on a failed refresh — a
        // transient network hiccup shouldn't blank out a card that was just showing fine.
        setLoadError(true);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setLoadError(false);
      setProfile(profileData);

      if (profileData) {
        const { data: linkData } = await supabase
          .from("profile_links")
          .select("*")
          .eq("profile_id", profileData.id)
          .eq("is_visible", true)
          .order("position", { ascending: true });
        setLinks(linkData ?? []);
      }

      setLoading(false);
      setRefreshing(false);
    },
    [session],
  );

  // Refetches whenever this tab regains focus, so edits made on /edit-profile show up
  // immediately on return instead of needing a full app reload.
  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load]),
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (loadError && !profile) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-3 px-6 pt-16">
          <Ionicons name="cloud-offline-outline" size={40} color={colors.muted} />
          <Text variant="h4">Couldn&apos;t load your card</Text>
          <Text variant="muted" className="text-center">
            Check your connection and try again.
          </Text>
          <Button icon="refresh-outline" onPress={() => load(false)} className="mt-2">
            Try again
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6 pt-16">
          <Text variant="muted" className="text-center">
            No card yet — finish onboarding first.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const url = cardUrl(profile.username);

  async function handleShare() {
    // `message` (not `url`) carries the link on Android — RN's Share API ignores `url` there.
    await Share.share({ message: url, url });
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="items-center gap-3 px-6 pt-16 pb-8"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
        }
      >
        <View className="w-full flex-row items-start gap-4">
          <View className="flex-1 items-start gap-1">
            <Avatar uri={profile.avatar_url} size={72} />
            <Text variant="h4" className="mt-2">
              {profile.display_name}
            </Text>
            {profile.designation && <Text variant="muted">{profile.designation}</Text>}
            {profile.company && <Text variant="muted">{profile.company}</Text>}
            {profile.bio && (
              <Text variant="muted" className="mt-1 text-sm" numberOfLines={3}>
                {profile.bio}
              </Text>
            )}
          </View>

          <View className="items-center gap-1">
            <QRCode value={cardUrl(profile.username, "qr")} size={110} />
            <View className="flex-row items-center gap-1">
              <Ionicons name="qr-code-outline" size={12} color={colors.muted} />
              <Text className="text-xs text-muted-foreground">Scan to open</Text>
            </View>
          </View>
        </View>

        <Text
          onPress={() => Linking.openURL(url)}
          accessibilityRole="link"
          className="mt-2 w-full rounded-md border border-border px-4 py-2 text-center text-sm text-muted-foreground underline"
        >
          tapit.in/u/{profile.username}
        </Text>

        {links.length > 0 ? (
          <View className="w-full gap-2">
            {links.map((link) => (
              <ListRow
                key={link.id}
                leading={
                  <Ionicons
                    name={(link.icon ?? "link-outline") as ComponentProps<typeof Ionicons>["name"]}
                    size={20}
                    color={colors.mutedForeground}
                  />
                }
                title={link.label}
                trailing={<Ionicons name="open-outline" size={16} color={colors.muted} />}
                onPress={() => Linking.openURL(link.value)}
              />
            ))}
          </View>
        ) : (
          <Text variant="muted" className="text-xs">
            Add links to your card from Edit Profile.
          </Text>
        )}

        <View className="mt-2 w-full flex-row gap-3">
          <Button
            icon="share-social-outline"
            onPress={handleShare}
            accessibilityLabel="Share your card"
            className="flex-1"
          >
            Share
          </Button>
          <Button
            variant="secondary"
            icon="create-outline"
            onPress={() => router.push("/edit-profile")}
            accessibilityLabel="Edit your profile"
            className="flex-1"
          >
            Edit Profile
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
