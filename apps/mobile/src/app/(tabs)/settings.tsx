import { useEffect, useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Database } from "@tapit/types";
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
    <View className={`h-8 w-8 items-center justify-center rounded-lg ${bgClass}`}>
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-6 px-5 pt-12 pb-12">
        <Text variant="h3" className="text-2xl font-bold tracking-tight text-foreground">
          Menu
        </Text>

        {/* Section 1: Digital Wallet Passes */}
        <View className="gap-2">
          <Text className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Digital Wallet Passes
          </Text>
          <View className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
            <ListRow
              title="Add to Apple Wallet"
              subtitle="Save pass for offline sharing on iPhone"
              leading={<IconBadge icon="logo-apple" bgClass="bg-neutral-900" />}
              trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
              onPress={handleOpenAppleWallet}
              showDivider
            />
            <ListRow
              title="Add to Google Wallet"
              subtitle="Save pass for offline sharing on Android"
              leading={<IconBadge icon="wallet-outline" bgClass="bg-indigo-600" />}
              trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
              onPress={handleOpenGoogleWallet}
            />
          </View>
        </View>

        {/* Section 2: Account */}
        <View className="gap-2">
          <Text className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Account
          </Text>
          <View className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
            {session?.user.email && (
              <ListRow
                title={session.user.email}
                subtitle="Signed in email"
                leading={<IconBadge icon="mail-outline" bgClass="bg-blue-600" />}
                showDivider
              />
            )}
            <ListRow
              title="Sign out"
              leading={<IconBadge icon="log-out-outline" bgClass="bg-amber-600" />}
              trailing={<Ionicons name="chevron-forward" size={16} color={colors.muted} />}
              onPress={() => supabase.auth.signOut()}
            />
          </View>
        </View>

        {/* Section 3: Danger Zone */}
        <View className="gap-2">
          <Text className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Danger Zone
          </Text>
          <View className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
            <ListRow
              title="Delete Account"
              subtitle="Permanently deletes your card and all data"
              leading={<IconBadge icon="trash-outline" bgClass="bg-rose-600" />}
              trailing={<Ionicons name="chevron-forward" size={16} color={colors.danger} />}
              onPress={() => setDeleteSheetOpen(true)}
            />
          </View>
        </View>
      </ScrollView>

      <BottomSheet visible={deleteSheetOpen} onClose={() => setDeleteSheetOpen(false)}>
        <View className="gap-3">
          <Text variant="h4">Delete your account?</Text>
          <Text variant="muted">
            This permanently deletes your card, links, photos, and all data. This can&apos;t be
            undone.
          </Text>
          {deleteError && (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text className="text-sm text-danger">{deleteError}</Text>
            </View>
          )}
          <Button
            variant="destructive"
            icon="trash-outline"
            onPress={handleConfirmDelete}
            loading={deleting}
          >
            Delete Account
          </Button>
          <Button variant="secondary" onPress={() => setDeleteSheetOpen(false)} disabled={deleting}>
            Cancel
          </Button>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
