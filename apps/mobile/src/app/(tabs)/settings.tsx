import { useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";
import { supabase } from "@/lib/supabase";

export default function SettingsScreen() {
  const { session } = useAuth();
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleConfirmDelete() {
    setDeleting(true);
    setDeleteError(null);
    const { error } = await supabase.rpc("delete_own_account");
    if (error) {
      setDeleting(false);
      setDeleteError(error.message);
      return;
    }
    // (tabs)/_layout.tsx redirects to /login once the session clears — no manual
    // navigation needed, same pattern the plain sign-out row below already relies on.
    await supabase.auth.signOut();
  }

  return (
    // Padding lives on this inner View, not the SafeAreaView — see docs/DECISIONS.md
    // (SafeAreaView's inline inset style silently overrides className padding).
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 gap-3 px-6 pt-16">
        <Text variant="h4">Menu</Text>

        <Text variant="large" className="mt-2">
          Account
        </Text>
        {session?.user.email && (
          <ListRow
            title={session.user.email}
            subtitle="Signed in"
            leading={<Ionicons name="mail-outline" size={20} color={colors.mutedForeground} />}
          />
        )}
        <ListRow
          title="Sign out"
          leading={<Ionicons name="log-out-outline" size={20} color={colors.mutedForeground} />}
          onPress={() => supabase.auth.signOut()}
        />

        <Text variant="large" className="mt-2">
          Danger zone
        </Text>
        <ListRow
          title="Delete Account"
          subtitle="Permanently deletes your card and all data"
          leading={<Ionicons name="trash-outline" size={20} color={colors.danger} />}
          onPress={() => setDeleteSheetOpen(true)}
        />
      </View>

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
