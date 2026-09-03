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
import QRCode from "react-native-qrcode-svg";
import { COLOR_PRESETS, WEB_TEMPLATES, type WebTemplateId } from "@tapit/core";
import type { Database } from "@tapit/types";
import { Avatar, type AvatarFocusMode } from "@/components/ui/avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { IdentityStudioCanvas } from "@/components/identity/identity-studio-canvas";
import { ShareActionBar } from "@/components/identity/share-action-bar";
import { ContextualTools } from "@/components/identity/contextual-tools";
import { InsightBanner } from "@/components/identity/insight-banner";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";
import { supabase } from "@/lib/supabase";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileLink = Database["public"]["Tables"]["profile_links"]["Row"];
type Insights = { views: number; qr_views: number; vcard_saves: number };

const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || "https://tapit.man2web.in";

export default function IdentityHomeScreen() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Bottom Sheets & State
  const [exchangeSheetOpen, setExchangeSheetOpen] = useState(false);
  const [customizeSheetOpen, setCustomizeSheetOpen] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);

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
      loadData(false);
    }, [loadData]),
  );

  async function updateThemeProperty(key: string, value: string) {
    if (!profile) return;
    setSavingTheme(true);
    const existing = (profile.theme ?? {}) as Record<string, unknown>;
    const updatedTheme = { ...existing, [key]: value };

    const { error } = await supabase
      .from("profiles")
      .update({ theme: updatedTheme as any })
      .eq("id", profile.id);

    if (!error) {
      setProfile({ ...profile, theme: updatedTheme as any });
    }
    setSavingTheme(false);
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (loadError || !profile) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6 text-center gap-3">
          <Ionicons name="card-outline" size={48} color={colors.mutedForeground} />
          <Text variant="h3" className="text-center">
            No Identity Profile Found
          </Text>
          <Text variant="muted" className="text-center text-xs">
            Complete onboarding to create your digital identity pass.
          </Text>
          <Button onPress={() => router.replace("/onboarding")} className="mt-2 rounded-full px-6">
            Create Identity
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const themeObj = (profile.theme ?? {}) as Record<string, unknown>;
  const focusMode = (themeObj.avatar_focus as AvatarFocusMode) ?? "center";
  const brandColor = (themeObj.primary as string) ?? "#2563EB";
  const activeTemplate = (themeObj.template as WebTemplateId) ?? "apple_minimal";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-5 pt-4 pb-12 items-center"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Bar */}
        <View className="w-full flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg font-black text-foreground tracking-tight">Identity Studio</Text>
            <View className="h-2 w-2 rounded-full bg-emerald-500" />
          </View>

          <Button
            size="sm"
            variant="outline"
            icon="create-outline"
            onPress={() => router.push("/edit-profile")}
            className="rounded-full px-3.5 border-border/70"
          >
            Studio Editor
          </Button>
        </View>

        {/* 🌟 1. Personal Identity Studio Canvas */}
        <IdentityStudioCanvas
          profile={profile}
          links={links}
          brandColor={brandColor}
          focusMode={focusMode}
          onEditPress={() => router.push("/edit-profile")}
        />

        {/* ⚡ 2. ONE Dominant Primary Action: Share Identity */}
        <ShareActionBar profile={profile} />

        {/* 🎛️ 3. Compact Secondary Networking Tools */}
        <ContextualTools
          onExchange={() => setExchangeSheetOpen(true)}
          onScanCard={() => router.push("/scan-card")}
          onCustomize={() => setCustomizeSheetOpen(true)}
        />

        {/* 📊 4. Single-Line Activity Telemetry */}
        <InsightBanner viewsCount={insights?.views ?? 0} />
      </ScrollView>

      {/* 🎨 Ambient Customization Sheet */}
      <BottomSheet visible={customizeSheetOpen} onClose={() => setCustomizeSheetOpen(false)}>
        <View className="gap-4 pb-2">
          <View className="flex-row items-center justify-between border-b border-border/40 pb-3">
            <View className="flex-row items-center gap-2">
              <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
              <Text className="text-base font-bold text-foreground">Card Style Inspector</Text>
            </View>
            {savingTheme && <ActivityIndicator size="small" color={colors.primary} />}
          </View>

          {/* Template Presets */}
          <View className="gap-2">
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Template Presets
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {WEB_TEMPLATES.map((tmpl) => {
                const isSelected = activeTemplate === tmpl.id;
                return (
                  <Pressable
                    key={tmpl.id}
                    onPress={() => updateThemeProperty("template", tmpl.id)}
                    className={`px-4 py-2.5 rounded-full border ${
                      isSelected ? "border-primary bg-primary/10" : "border-border/60 bg-card"
                    }`}
                  >
                    <Text className={`text-xs font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {tmpl.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Accent Color Swatches */}
          <View className="gap-2">
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Accent Color
            </Text>
            <View className="flex-row flex-wrap gap-2.5">
              {COLOR_PRESETS.map((preset) => {
                const isSelected = brandColor === preset.hex;
                return (
                  <Pressable
                    key={preset.id}
                    onPress={() => updateThemeProperty("primary", preset.hex)}
                    className={`flex-row items-center gap-2 rounded-full border px-3 py-1.5 ${
                      isSelected ? "border-primary bg-primary/10" : "border-border/60 bg-card"
                    }`}
                  >
                    <View className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: preset.hex }} />
                    <Text className="text-xs font-semibold text-foreground">{preset.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="gap-2.5 pt-2">
            <Button
              icon="create-outline"
              onPress={() => {
                setCustomizeSheetOpen(false);
                router.push("/edit-profile");
              }}
              className="w-full rounded-full py-3.5"
            >
              Open Full Studio Editor
            </Button>
            <Button variant="secondary" onPress={() => setCustomizeSheetOpen(false)} className="w-full rounded-full">
              Done
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
            Have the other person scan your QR code to share their contact details back to your mobile app.
          </Text>

          <View className="items-center justify-center p-5 bg-white rounded-3xl shadow-md border border-neutral-200 my-2">
            <QRCode value={profile ? `${WEB_BASE_URL}/u/${profile.username}?source=qr` : WEB_BASE_URL} size={170} />
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
