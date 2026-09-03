import { useCallback, useState, type ComponentProps } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import type { Database } from "@tapit/types";
import { Avatar, type AvatarFocusMode } from "@/components/ui/avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";
import { supabase } from "@/lib/supabase";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileLink = Database["public"]["Tables"]["profile_links"]["Row"];
type Insights = { views: number; qr_views: number; vcard_saves: number };

const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || "https://tapit.man2web.in";

function cardUrl(username: string, source?: "qr") {
  const base = `${WEB_BASE_URL}/u/${username}`;
  return source ? `${base}?source=${source}` : base;
}

export default function CardScreen() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [exchangeSheetOpen, setExchangeSheetOpen] = useState(false);
  const [qrSheetOpen, setQrSheetOpen] = useState(false);

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

        const { data: insightsData } = await supabase.rpc("get_profile_insights").single();
        if (insightsData) {
          setInsights(insightsData);
        }
      }

      setLoading(false);
      setRefreshing(false);
    },
    [session],
  );

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
          <Button icon="refresh-outline" onPress={() => load(false)} className="mt-2 rounded-full px-6">
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
  const avatarFocusMode = ((profile.theme as Record<string, unknown> | null)?.avatar_focus as AvatarFocusMode) || "head";

  async function handleShare() {
    await Share.share({ message: url, url });
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="items-center gap-5 px-5 pt-6 pb-12"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
        }
      >
        {/* Top Header */}
        <View className="w-full flex-row items-center justify-between">
          <View>
            <Text variant="h3" className="text-2xl font-bold tracking-tight text-foreground">
              My Card
            </Text>
            <Text variant="muted" className="text-xs">
              Executive NFC Digital Profile & Business Card
            </Text>
          </View>

          <Button
            size="sm"
            variant="outline"
            icon="create-outline"
            onPress={() => router.push("/edit-profile")}
            className="rounded-full px-4 border-border/70"
          >
            Edit Profile
          </Button>
        </View>

        {/* Executive Profile Card Header */}
        <View className="w-full overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
          {/* Executive Top Banner Gradient */}
          <View className="h-32 w-full bg-gradient-to-r from-slate-900 via-neutral-900 to-indigo-950 relative justify-between p-4">
            <View className="flex-row items-center justify-between w-full">
              <View className="flex-row items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md px-3 py-1 border border-white/20">
                <Ionicons name="card-outline" size={12} color="#ffffff" />
                <Text className="text-[11px] font-bold text-white uppercase tracking-wider">
                  NFC Executive Pass
                </Text>
              </View>

              {/* QR Code Quick Launcher */}
              <Pressable
                onPress={() => setQrSheetOpen(true)}
                className="h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-md active:scale-95 transition-transform"
              >
                <Ionicons name="qr-code" size={20} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          {/* Overlapping Avatar & Bio Body */}
          <View className="px-6 pb-6 pt-0">
            <View className="-mt-14 flex-row items-end justify-between">
              {/* Overlapping Avatar Frame */}
              <View className="rounded-full border-4 border-card bg-card shadow-xl">
                <Avatar
                  uri={profile.avatar_url}
                  size={100}
                  focusMode={avatarFocusMode}
                  onPress={() => router.push("/edit-profile")}
                  showEditBadge
                />
              </View>

              {/* Logo Badge */}
              {profile.logo_url ? (
                <View className="mb-2 h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-background p-1.5 shadow-xs">
                  <Image source={{ uri: profile.logo_url }} className="h-full w-full rounded-xl" resizeMode="contain" />
                </View>
              ) : null}
            </View>

            {/* User Executive Details */}
            <View className="mt-3 gap-1">
              <View className="flex-row items-center gap-2">
                <Text variant="h3" className="text-2xl font-bold text-foreground">
                  {profile.display_name}
                </Text>
                <Ionicons name="checkmark-circle-sharp" size={20} color={colors.primary} />
              </View>

              {/* Title & Company Badges */}
              {(profile.designation || profile.company) ? (
                <View className="flex-row flex-wrap items-center gap-2 mt-1">
                  {profile.designation ? (
                    <View className="rounded-full bg-primary/10 px-3 py-1 border border-primary/20">
                      <Text className="text-xs font-semibold text-primary">{profile.designation}</Text>
                    </View>
                  ) : null}

                  {profile.company ? (
                    <View className="flex-row items-center gap-1 rounded-full bg-accent/60 px-3 py-1 border border-border/50">
                      <Ionicons name="business-outline" size={12} color={colors.muted} />
                      <Text className="text-xs font-medium text-foreground">{profile.company}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* Bio Statement */}
              {profile.bio ? (
                <View className="mt-2.5 border-l-2 border-primary/60 pl-3 py-0.5">
                  <Text variant="muted" className="text-xs text-muted-foreground leading-relaxed" numberOfLines={3}>
                    {profile.bio}
                  </Text>
                </View>
              ) : null}

              {/* Live Engagement Key Metrics Strip */}
              <View className="mt-4 flex-row items-center justify-around rounded-2xl border border-border/50 bg-accent/30 py-3 px-2">
                <View className="items-center">
                  <Text className="text-base font-extrabold text-foreground">{insights?.views ?? 0}</Text>
                  <Text className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Views</Text>
                </View>
                <View className="h-6 w-[1px] bg-border/60" />
                <View className="items-center">
                  <Text className="text-base font-extrabold text-foreground">{insights?.qr_views ?? 0}</Text>
                  <Text className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Scans</Text>
                </View>
                <View className="h-6 w-[1px] bg-border/60" />
                <View className="items-center">
                  <Text className="text-base font-extrabold text-foreground">{insights?.vcard_saves ?? 0}</Text>
                  <Text className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Saves</Text>
                </View>
              </View>
            </View>

            {/* Profile Handle Link Box */}
            <Pressable
              onPress={() => Linking.openURL(url)}
              className="mt-3.5 flex-row items-center justify-between rounded-2xl border border-border/50 bg-accent/40 px-4 py-2.5"
            >
              <View className="flex-row items-center gap-2 flex-1">
                <Ionicons name="globe-outline" size={16} color={colors.primary} />
                <Text className="text-xs font-semibold text-foreground underline" numberOfLines={1}>
                  tapit.man2web.in/u/{profile.username}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        {/* Connected Channels List */}
        {links.length > 0 ? (
          <View className="w-full gap-2">
            <Text className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Connected Channels ({links.length})
            </Text>
            <View className="w-full overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
              {links.map((link, idx) => (
                <ListRow
                  key={link.id}
                  showDivider={idx < links.length - 1}
                  leading={
                    <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                      <Ionicons
                        name={(link.icon ?? "link-outline") as ComponentProps<typeof Ionicons>["name"]}
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                  }
                  title={link.label}
                  trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
                  onPress={() => Linking.openURL(link.value)}
                />
              ))}
            </View>
          </View>
        ) : (
          <Text variant="muted" className="text-xs">
            Add links to your card from Edit Profile.
          </Text>
        )}

        {/* Executive Action Buttons */}
        <View className="w-full gap-2.5 pt-1">
          <Button
            icon="people-outline"
            onPress={() => setExchangeSheetOpen(true)}
            accessibilityLabel="Exchange Contacts"
            className="w-full py-3.5 rounded-full shadow-sm"
          >
            Exchange Contacts
          </Button>

          <View className="w-full flex-row gap-2.5">
            <Button
              variant="outline"
              icon="share-social-outline"
              onPress={handleShare}
              accessibilityLabel="Share your card"
              className="flex-1 rounded-full border-border/70 py-3"
            >
              Share Profile
            </Button>
            <Button
              variant="secondary"
              icon="qr-code-outline"
              onPress={() => setQrSheetOpen(true)}
              accessibilityLabel="Show QR Code"
              className="flex-1 rounded-full py-3"
            >
              Show QR Code
            </Button>
          </View>
        </View>
      </ScrollView>

      {/* QR Code Presentation Sheet */}
      <BottomSheet visible={qrSheetOpen} onClose={() => setQrSheetOpen(false)}>
        <View className="items-center gap-4 text-center pb-2">
          <Text variant="h4" className="text-center font-bold">
            Scan My Digital Card
          </Text>
          <Text variant="muted" className="text-center text-xs px-2">
            Point smartphone camera at this code to view profile, save vCard contact, or connect.
          </Text>

          <View className="items-center justify-center p-6 bg-white rounded-3xl shadow-md border border-neutral-200 my-2">
            <QRCode value={cardUrl(profile.username, "qr")} size={180} />
          </View>

          <View className="w-full gap-2.5 pt-2">
            <Button icon="share-social-outline" onPress={handleShare} className="w-full rounded-full py-3.5 shadow-sm">
              Share Profile Link
            </Button>
            <Button variant="secondary" onPress={() => setQrSheetOpen(false)} className="w-full rounded-full">
              Close
            </Button>
          </View>
        </View>
      </BottomSheet>

      {/* Two-Way Contact Exchange Sheet */}
      <BottomSheet visible={exchangeSheetOpen} onClose={() => setExchangeSheetOpen(false)}>
        <View className="items-center gap-4 text-center pb-2">
          <Text variant="h4" className="text-center font-bold">
            Exchange Contacts
          </Text>
          <Text variant="muted" className="text-center text-xs px-2">
            Have the other person scan your code to share their contact details directly back to your mobile app!
          </Text>

          <View className="items-center justify-center p-5 bg-white rounded-3xl shadow-md border border-neutral-200 my-2">
            <QRCode value={profile ? cardUrl(profile.username, "qr") : WEB_BASE_URL} size={170} />
          </View>

          <View className="w-full gap-2.5 pt-2">
            <Button
              icon="scan-outline"
              onPress={() => {
                setExchangeSheetOpen(false);
                router.push("/scan-card");
              }}
              className="w-full rounded-full py-3.5"
            >
              Scan Paper Business Card
            </Button>
            <Button variant="secondary" onPress={() => setExchangeSheetOpen(false)} className="w-full rounded-full">
              Done
            </Button>
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
