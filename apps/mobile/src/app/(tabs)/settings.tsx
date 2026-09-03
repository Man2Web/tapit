import { useEffect, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { Database } from "@tapit/types";
import { Avatar } from "@/components/ui/avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";
import { supabase } from "@/lib/supabase";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || "https://tapit.man2web.in";

function IconBadge({
  icon,
  color = "#ffffff",
  bgClass,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  bgClass: string;
}) {
  return (
    <View className={`h-8 w-8 items-center justify-center rounded-xl ${bgClass}`}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
  );
}

export default function SettingsScreen() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("owner_id", session.user.id)
      .eq("is_primary", true)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [session]);

  async function handleConfirmDelete() {
    setDeleting(true);
    setDeleteError(null);
    const { error } = await supabase.rpc("delete_own_account");
    if (error) {
      setDeleting(false);
      setDeleteError(error.message);
      return;
    }
    await supabase.auth.signOut();
  }

  function handleOpenAppleWallet() {
    if (profile?.username) {
      Linking.openURL(`${WEB_BASE_URL}/api/wallet/apple/${profile.username}`);
    }
  }

  function handleOpenGoogleWallet() {
    if (profile?.username) {
      Linking.openURL(`${WEB_BASE_URL}/api/wallet/google/${profile.username}`);
    }
  }

  const isIOS = Platform.OS === "ios";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-6 px-5 pt-6 pb-12" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text variant="h3" className="text-2xl font-bold tracking-tight text-foreground">
              You & Settings
            </Text>
            <Text variant="muted" className="text-xs">
              Account preferences, hardware store & wallet passes
            </Text>
          </View>
        </View>

        {/* 👤 Hero User Profile Card */}
        {profile && (
          <Pressable
            onPress={() => router.push("/edit-profile")}
            className="flex-row items-center justify-between rounded-3xl border border-border/60 bg-card p-4 shadow-xs active:bg-accent"
          >
            <View className="flex-row items-center gap-3.5">
              <Avatar
                uri={profile.avatar_url}
                size={64}
                focusMode={typeof (profile.theme as any)?.avatar_focus === "string" ? (profile.theme as any).avatar_focus : "center"}
                zoom={typeof (profile.theme as any)?.avatar_zoom === "number" ? (profile.theme as any).avatar_zoom : undefined}
                panX={typeof (profile.theme as any)?.avatar_pan_x === "number" ? (profile.theme as any).avatar_pan_x : undefined}
                panY={typeof (profile.theme as any)?.avatar_pan_y === "number" ? (profile.theme as any).avatar_pan_y : undefined}
                rotation={typeof (profile.theme as any)?.avatar_rotation === "number" ? (profile.theme as any).avatar_rotation : undefined}
                aspectMask={typeof (profile.theme as any)?.avatar_aspect_mask === "string" ? (profile.theme as any).avatar_aspect_mask : undefined}
                colorFilter={typeof (profile.theme as any)?.avatar_color_filter === "string" ? (profile.theme as any).avatar_color_filter : undefined}
              />
              <View className="gap-0.5">
                <Text className="text-base font-bold text-foreground">{profile.display_name}</Text>
                <Text className="text-xs text-muted-foreground">
                  {profile.designation ? `${profile.designation} • ` : ""}tapit.man2web.in/u/{profile.username}
                </Text>
              </View>
            </View>

            <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
              <Ionicons name="create-outline" size={18} color={colors.primary} />
            </View>
          </Pressable>
        )}

        {/* 📊 Analytics & Health Activity Rings */}
        <View className="gap-2">
          <Text className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Telemetry & Insights
          </Text>
          <View className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xs">
            <ListRow
              title="Analytics Overview"
              subtitle="View total profile visits, QR scans & vCard saves"
              leading={<IconBadge icon="analytics-outline" bgClass="bg-blue-600" />}
              trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
              onPress={() => router.push("/insights")}
            />
          </View>
        </View>

        {/* 💳 Auto-Detected Digital Wallet Passes */}
        <View className="gap-2">
          <Text className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Digital Wallet Passes
          </Text>
          <View className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xs">
            {isIOS ? (
              <>
                <ListRow
                  title="Add to Apple Wallet"
                  subtitle="Primary pass for offline sharing on iPhone"
                  leading={<IconBadge icon="logo-apple" bgClass="bg-black" />}
                  trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
                  onPress={handleOpenAppleWallet}
                  showDivider
                />
                <ListRow
                  title="Add to Google Wallet"
                  subtitle="Alternative pass for Android devices"
                  leading={<IconBadge icon="wallet-outline" bgClass="bg-indigo-600" />}
                  trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
                  onPress={handleOpenGoogleWallet}
                />
              </>
            ) : (
              <>
                <ListRow
                  title="Add to Google Wallet"
                  subtitle="Primary pass for offline sharing on Android"
                  leading={<IconBadge icon="wallet-outline" bgClass="bg-indigo-600" />}
                  trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
                  onPress={handleOpenGoogleWallet}
                  showDivider
                />
                <ListRow
                  title="Add to Apple Wallet"
                  subtitle="Alternative pass for iPhone devices"
                  leading={<IconBadge icon="logo-apple" bgClass="bg-black" />}
                  trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
                  onPress={handleOpenAppleWallet}
                />
              </>
            )}
          </View>
        </View>

        {/* 🛒 Physical NFC Hardware Store */}
        <View className="gap-2">
          <Text className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            NFC Hardware Store
          </Text>
          <View className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xs">
            <ListRow
              title="Order Physical NFC Cards"
              subtitle="Executive Titanium, Bamboo & Polycarbonate Cards"
              leading={<IconBadge icon="bag-handle-outline" bgClass="bg-purple-600" />}
              trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
              onPress={() => router.push("/shop")}
            />
          </View>
        </View>

        {/* ⚙️ Account Management */}
        <View className="gap-2">
          <Text className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Account Management
          </Text>
          <View className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xs">
            {session?.user.email && (
              <ListRow
                title={session.user.email}
                subtitle="Signed in account email"
                leading={<IconBadge icon="mail-outline" bgClass="bg-emerald-600" />}
                showDivider
              />
            )}
            <ListRow
              title="Sign Out"
              leading={<IconBadge icon="log-out-outline" bgClass="bg-amber-600" />}
              trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
              onPress={() => supabase.auth.signOut()}
            />
          </View>
        </View>

        {/* ⚠️ Danger Zone */}
        <View className="gap-2">
          <Text className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Danger Zone
          </Text>
          <View className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xs">
            <ListRow
              title="Delete Account"
              subtitle="Permanently deletes your profile, card & contacts"
              leading={<IconBadge icon="trash-outline" bgClass="bg-rose-600" />}
              trailing={<Ionicons name="chevron-forward" size={16} color={colors.danger} />}
              onPress={() => setDeleteSheetOpen(true)}
            />
          </View>
        </View>
      </ScrollView>

      {/* Delete Account Modal Sheet */}
      <BottomSheet visible={deleteSheetOpen} onClose={() => setDeleteSheetOpen(false)}>
        <View className="gap-4 pb-2">
          <View className="items-center gap-2 text-center pt-1">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-rose-500/10">
              <Ionicons name="trash-outline" size={28} color={colors.danger} />
            </View>
            <Text variant="h4" className="text-center font-bold text-foreground">
              Delete Account?
            </Text>
            <Text variant="muted" className="text-center text-xs px-2">
              This permanently deletes your card, links, photos, and all saved contacts. This action cannot be undone.
            </Text>
          </View>

          {deleteError && (
            <View className="flex-row items-center gap-1.5 px-2">
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text className="text-xs text-danger">{deleteError}</Text>
            </View>
          )}

          <View className="gap-2.5 pt-2">
            <Button
              variant="destructive"
              icon="trash-outline"
              onPress={handleConfirmDelete}
              loading={deleting}
              className="rounded-full py-3.5"
            >
              Delete My Account
            </Button>
            <Button
              variant="secondary"
              onPress={() => setDeleteSheetOpen(false)}
              disabled={deleting}
              className="rounded-full py-3"
            >
              Cancel
            </Button>
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
