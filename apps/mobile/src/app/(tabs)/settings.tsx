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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-6 px-5 pt-8 pb-12">
        <View>
          <Text variant="h3" className="text-2xl font-bold tracking-tight text-foreground">
            Settings & Wallet
          </Text>
          <Text variant="muted" className="text-xs">
            App configuration & pass management
          </Text>
        </View>

        {/* Section 1: Digital Wallet Passes */}
        <View className="gap-2">
          <Text className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Digital Wallet Passes
          </Text>
          <View className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
            <ListRow
              title="Add to Apple Wallet"
              subtitle="Save pass for offline sharing on iPhone"
              leading={<IconBadge icon="logo-apple" bgClass="bg-black" />}
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
          <View className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
            {session?.user.email && (
              <ListRow
                title={session.user.email}
                subtitle="Signed in account email"
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
          <View className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
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
