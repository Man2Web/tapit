import { useEffect, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { Database } from "@tapit/types";
import { Avatar } from "@/components/ui/avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";
import { supabase } from "@/lib/supabase";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type AvatarFocusMode = "head" | "center" | "top" | "bottom";

const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || "https://tapit.man2web.in";

type MenuSection = {
  title: string;
  items: MenuItem[];
};

type MenuItem = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  subtitle?: string;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
  badge?: string;
};

export default function MoreScreen() {
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

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const themeObj = (profile?.theme ?? {}) as Record<string, unknown>;
  const focusMode = (themeObj.avatar_focus as AvatarFocusMode) ?? "center";

  const sections: MenuSection[] = [
    {
      title: "Profile & Identity",
      items: [
        {
          icon: "create-outline",
          label: "Edit Profile",
          subtitle: "Update your digital identity",
          iconBg: "bg-primary/10",
          iconColor: colors.primary,
          onPress: () => router.push("/edit-profile"),
        },
        {
          icon: "eye-outline",
          label: "Preview Profile",
          subtitle: profile?.username ? `tapit.man2web.in/u/${profile.username}` : "View your public page",
          iconBg: "bg-emerald-500/10",
          iconColor: "#10B981",
          onPress: () => {
            if (profile?.username) {
              Linking.openURL(`${WEB_BASE_URL}/u/${profile.username}`);
            }
          },
        },
      ],
    },
    {
      title: "Hardware & Integrations",
      items: [
        {
          icon: "hardware-chip-outline",
          label: "NFC Devices",
          subtitle: "Manage connected cards, stickers & badges",
          iconBg: "bg-violet-500/10",
          iconColor: "#7C2FD6",
          onPress: () => router.push("/devices"),
        },
        {
          icon: "wallet-outline",
          label: "Wallet Pass",
          subtitle: Platform.OS === "ios" ? "Add to Apple Wallet" : "Add to Google Wallet",
          iconBg: "bg-amber-500/10",
          iconColor: "#F59E0B",
          onPress: () => {
            if (profile?.username) {
              const platform = Platform.OS === "ios" ? "apple" : "google";
              Linking.openURL(`${WEB_BASE_URL}/api/wallet/${platform}/${profile.username}`);
            }
          },
        },
      ],
    },
    {
      title: "Business",
      items: [
        {
          icon: "people-outline",
          label: "Team Workspace",
          subtitle: "Manage team profiles and branding",
          iconBg: "bg-blue-500/10",
          iconColor: "#3B82F6",
          onPress: () => router.push("/teams"),
        },
        {
          icon: "storefront-outline",
          label: "Shop",
          subtitle: "Browse NFC cards and accessories",
          iconBg: "bg-rose-500/10",
          iconColor: "#E11D48",
          onPress: () => router.push("/shop"),
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          icon: "shield-checkmark-outline",
          label: "Privacy & Security",
          subtitle: "Control visibility and data collection",
          iconBg: "bg-teal-500/10",
          iconColor: "#14B8A6",
          onPress: () => {
            // Will be built in Phase 5
          },
        },
        {
          icon: "notifications-outline",
          label: "Notifications",
          subtitle: "Configure alerts and reminders",
          iconBg: "bg-orange-500/10",
          iconColor: "#F97316",
          onPress: () => {
            // Will be built in Phase 5
          },
        },
        {
          icon: "log-out-outline",
          label: "Sign Out",
          iconBg: "bg-neutral-500/10",
          iconColor: "#6B7280",
          onPress: handleSignOut,
        },
      ],
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-6 px-5 pt-6 pb-12" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="gap-1">
          <Text variant="h3" className="text-2xl font-bold tracking-tight text-foreground">
            More
          </Text>
          <Text variant="muted" className="text-xs text-muted-foreground">
            Settings, integrations, and account management.
          </Text>
        </View>

        {/* Profile Summary Card */}
        {profile && (
          <Card className="flex-row items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs">
            <Avatar
              uri={profile.avatar_url}
              size={52}
              focusMode={focusMode as any}
            />
            <View className="flex-1 gap-0.5">
              <Text className="text-base font-bold text-foreground">{profile.display_name}</Text>
              {profile.designation && (
                <Text className="text-xs text-muted-foreground">
                  {profile.designation}{profile.company ? ` at ${profile.company}` : ""}
                </Text>
              )}
              <Text className="text-xs font-mono text-primary">
                @{profile.username}
              </Text>
            </View>
            <Button
              size="sm"
              variant="outline"
              icon="create-outline"
              onPress={() => router.push("/edit-profile")}
              className="rounded-xl"
            >
              Edit
            </Button>
          </Card>
        )}

        {/* Menu Sections */}
        {sections.map((section) => (
          <View key={section.title} className="gap-2.5">
            <Text className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </Text>
            <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
              {section.items.map((item, idx) => (
                <Pressable
                  key={item.label}
                  onPress={item.onPress}
                  className={`flex-row items-center gap-3.5 px-4 py-3.5 active:bg-accent/50 ${
                    idx < section.items.length - 1 ? "border-b border-border/40" : ""
                  }`}
                >
                  <View className={`h-9 w-9 items-center justify-center rounded-xl ${item.iconBg}`}>
                    <Ionicons name={item.icon} size={18} color={item.iconColor} />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text className="text-sm font-bold text-foreground">{item.label}</Text>
                    {item.subtitle && (
                      <Text className="text-xs text-muted-foreground">{item.subtitle}</Text>
                    )}
                  </View>
                  {item.badge && (
                    <View className="rounded-full bg-primary/10 px-2 py-0.5 border border-primary/20">
                      <Text className="text-[10px] font-bold text-primary">{item.badge}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </Pressable>
              ))}
            </Card>
          </View>
        ))}

        {/* Danger Zone */}
        <View className="gap-2.5 pt-2">
          <Text className="px-1 text-xs font-semibold uppercase tracking-wider text-destructive/60">
            Danger Zone
          </Text>
          <Pressable
            onPress={() => setDeleteSheetOpen(true)}
            className="flex-row items-center gap-3.5 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3.5 active:bg-destructive/10"
          >
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-destructive/10">
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-sm font-bold text-danger">Delete Account</Text>
              <Text className="text-xs text-muted-foreground">
                Permanently delete your account and all data
              </Text>
            </View>
          </Pressable>
        </View>

        {/* App Version */}
        <View className="items-center pt-4 pb-2">
          <Text className="text-xs text-muted-foreground">TapIt v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Delete Account Sheet */}
      <BottomSheet visible={deleteSheetOpen} onClose={() => setDeleteSheetOpen(false)}>
        <View className="gap-4 pb-2">
          <View className="items-center gap-2">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
              <Ionicons name="warning-outline" size={28} color={colors.danger} />
            </View>
            <Text variant="h4" className="text-base font-bold text-center">
              Delete Your Account?
            </Text>
            <Text variant="muted" className="text-xs text-center">
              This will permanently delete your profile, leads, analytics data, and all connected
              devices. This action cannot be undone.
            </Text>
          </View>

          {deleteError && (
            <View className="flex-row items-center gap-2 rounded-xl bg-destructive/10 p-3 border border-destructive/20">
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text className="text-xs font-semibold text-danger flex-1">{deleteError}</Text>
            </View>
          )}

          <View className="gap-2 pt-2">
            <Button
              variant="destructive"
              onPress={handleConfirmDelete}
              loading={deleting}
              className="w-full rounded-xl py-3.5"
            >
              Yes, Delete My Account
            </Button>
            <Button
              variant="secondary"
              onPress={() => setDeleteSheetOpen(false)}
              className="w-full rounded-xl"
            >
              Cancel
            </Button>
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
