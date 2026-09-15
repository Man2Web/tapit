import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Database } from "@tapit/types";
import { type AvatarFocusMode } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { HomeProfileCard } from "@/components/home/home-profile-card";
import { HomeQuickActions } from "@/components/home/home-quick-actions";
import { HomeActivityRow } from "@/components/home/home-activity-row";
import { HomeConnectionsList } from "@/components/home/home-connections-list";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";
import { supabase } from "@/lib/supabase";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Lead = Database["public"]["Tables"]["leads"]["Row"];
type Insights = { views: number; qr_views: number; vcard_saves: number };

const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || "https://tapit.man2web.in";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getProfileCompleteness(profile: Profile, linkCount: number): number {
  const fields: boolean[] = [
    !!profile.display_name,
    !!profile.avatar_url,
    !!profile.designation,
    !!profile.company,
    !!profile.bio,
    linkCount > 0,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

function getCompletionHint(profile: Profile, linkCount: number): string | null {
  if (!profile.avatar_url) return "Add a profile photo to make your profile stand out.";
  if (!profile.designation) return "Add your designation to complete your profile.";
  if (!profile.company) return "Add your company name.";
  if (!profile.bio) return "Write a short bio about yourself.";
  if (linkCount === 0) return "Add your contact links and social profiles.";
  return null;
}

type StatusIndicator = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  color: string;
  bgColor: string;
};

export default function HomeScreen() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [leadCount, setLeadCount] = useState<number>(0);
  const [linkCount, setLinkCount] = useState<number>(0);
  const [todayViews, setTodayViews] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadData = useCallback(
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
        // Links count
        const { count: linksCount } = await supabase
          .from("profile_links")
          .select("*", { count: "exact", head: true })
          .eq("profile_id", profileData.id)
          .eq("is_visible", true);
        setLinkCount(linksCount ?? 0);

        // Recent leads (for connections list)
        const { data: recentLeads } = await supabase
          .from("leads")
          .select("*")
          .eq("profile_id", profileData.id)
          .order("created_at", { ascending: false })
          .limit(5);
        setLeads(recentLeads ?? []);

        // Lead count
        const { count } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("profile_id", profileData.id);
        setLeadCount(count ?? 0);

        // Insights
        const { data: insightsData } = await supabase.rpc("get_profile_insights").single();
        if (insightsData) {
          setInsights(insightsData);
        }

        // Today's views (approximation: total views today)
        setTodayViews(insightsData?.views ? Math.min(insightsData.views, 99) : 0);
      }

      setLoading(false);
      setRefreshing(false);
    },
    [session],
  );

  useFocusEffect(
    useCallback(() => {
      loadData(false);
    }, [loadData]),
  );

  // --- Loading state ---
  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // --- Error / no profile state ---
  if (loadError || !profile) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6 gap-3">
          <Ionicons name="person-outline" size={40} color={colors.mutedForeground} />
          <Text className="text-lg font-semibold text-foreground text-center">
            No profile found
          </Text>
          <Text className="text-sm text-muted-foreground text-center">
            Create your profile to start sharing your professional identity.
          </Text>
          <Button onPress={() => router.replace("/onboarding")} className="mt-2 rounded-lg px-6">
            Create Profile
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const themeObj = (profile.theme ?? {}) as Record<string, unknown>;
  const focusMode = (themeObj.avatar_focus as AvatarFocusMode) ?? "center";

  const stats = insights ?? { views: 0, qr_views: 0, vcard_saves: 0 };
  const completeness = getProfileCompleteness(profile, linkCount);
  const completionHint = getCompletionHint(profile, linkCount);
  const displayName = profile.display_name?.split(" ")[0] ?? "there";

  const statusIndicators: StatusIndicator[] = [
    {
      icon: "radio-button-on",
      label: "Status",
      value: profile.is_active ? "Active" : "Inactive",
      color: profile.is_active ? "#10B981" : "#EF4444",
      bgColor: profile.is_active ? "bg-emerald-500/10" : "bg-red-500/10",
    },
    {
      icon: "eye-outline",
      label: "Total Views",
      value: String(stats.views),
      color: "#2563EB",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: "people-outline",
      label: "Leads",
      value: String(leadCount),
      color: "#7C2FD6",
      bgColor: "bg-violet-500/10",
    },
    {
      icon: "link-outline",
      label: "Links",
      value: String(linkCount),
      color: "#F59E0B",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-4 pb-12 gap-5"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Greeting */}
        <View className="gap-0.5">
          <Text className="text-2xl font-bold tracking-tight text-foreground">
            {getGreeting()}, {displayName}
          </Text>
          <Text className="text-sm text-muted-foreground">
            Here's your digital identity at a glance.
          </Text>
        </View>

        {/* 2. Profile Card */}
        <HomeProfileCard profile={profile} focusMode={focusMode} />

        {/* 3. Identity Status Indicators */}
        <View className="flex-row gap-2">
          {statusIndicators.map((indicator) => (
            <View
              key={indicator.label}
              className={`flex-1 items-center gap-1.5 rounded-xl border border-border bg-card p-3 shadow-xs`}
            >
              <View className={`h-8 w-8 items-center justify-center rounded-lg ${indicator.bgColor}`}>
                <Ionicons name={indicator.icon} size={16} color={indicator.color} />
              </View>
              <Text className="text-lg font-extrabold text-foreground">{indicator.value}</Text>
              <Text className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {indicator.label}
              </Text>
            </View>
          ))}
        </View>

        {/* 4. Profile Completion (only if incomplete) */}
        {completeness < 100 && completionHint && (
          <Card className="w-full rounded-2xl border border-border bg-card p-4 gap-3 shadow-xs">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                <Text className="text-sm font-bold text-foreground">
                  Profile Completeness
                </Text>
              </View>
              <Text className="text-sm font-extrabold text-primary">
                {completeness}%
              </Text>
            </View>
            {/* Progress bar */}
            <View className="w-full h-2 rounded-full bg-secondary overflow-hidden">
              <View
                className="h-full rounded-full bg-primary"
                style={{ width: `${completeness}%` }}
              />
            </View>
            <Text className="text-xs text-muted-foreground">
              {completionHint}
            </Text>
            <Button
              variant="outline"
              size="sm"
              icon="arrow-forward-outline"
              onPress={() => router.push("/edit-profile")}
              className="self-start rounded-xl"
            >
              Complete Profile
            </Button>
          </Card>
        )}

        {/* 5. Quick Actions */}
        <HomeQuickActions
          actions={[
            {
              label: "Edit Profile",
              icon: "create-outline",
              onPress: () => router.push("/edit-profile"),
            },
            {
              label: "Share",
              icon: "share-outline",
              onPress: () => router.push("/share"),
            },
            {
              label: "Scan Card",
              icon: "scan-outline",
              onPress: () => router.push("/scan-card"),
            },
            {
              label: "Add Lead",
              icon: "person-add-outline",
              onPress: () => router.push("/leads"),
            },
          ]}
        />

        {/* 6. Activity Summary */}
        <HomeActivityRow
          metrics={[
            { label: "Views", value: stats.views },
            { label: "QR Scans", value: stats.qr_views },
            { label: "Contacts", value: leadCount },
            { label: "vCard Saves", value: stats.vcard_saves },
          ]}
        />

        {/* 7. Recent Connections */}
        {leads.length > 0 && (
          <View className="gap-3">
            <View className="flex-row items-center justify-between px-1">
              <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recent Connections
              </Text>
              <Pressable onPress={() => router.push("/leads")}>
                <Text className="text-xs font-bold text-primary">See All</Text>
              </Pressable>
            </View>
            <HomeConnectionsList leads={leads} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
