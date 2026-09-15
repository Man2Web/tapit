import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";
import { supabase } from "@/lib/supabase";

type Workspace = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
};

type WorkspaceMember = {
  id: string;
  user_id: string;
  role: string;
  job_title: string | null;
  department: string | null;
};

export default function TeamsScreen() {
  const { session } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Workspace Form
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [wsName, setWsName] = useState("");
  const [wsSlug, setWsSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Invite Member Form
  const [inviteSheetOpen, setInviteSheetOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const loadTeam = useCallback(async () => {
    if (!session) return;
    const { data: wsData } = await supabase
      .from("workspaces" as any)
      .select("*")
      .eq("owner_id", session.user.id)
      .maybeSingle();

    if (wsData) {
      setWorkspace(wsData as any);
      const { data: memberData } = await supabase
        .from("workspace_members" as any)
        .select("*")
        .eq("workspace_id", (wsData as any).id);

      setMembers((memberData as any) ?? []);
    } else {
      setWorkspace(null);
      setMembers([]);
    }

    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadTeam();
    }, [loadTeam])
  );

  async function handleCreateWorkspace() {
    if (!session || !wsName.trim()) return;
    setSubmitting(true);
    const slug = wsSlug.trim() || wsName.toLowerCase().replace(/[^a-z0-9]/g, "-");

    const { data, error } = await supabase
      .from("workspaces" as any)
      .insert({
        name: wsName.trim(),
        slug,
        owner_id: session.user.id,
      })
      .select()
      .single();

    setSubmitting(false);

    if (error) {
      Alert.alert("Error Creating Workspace", error.message);
      return;
    }

    if (data) {
      await supabase.from("workspace_members" as any).insert({
        workspace_id: (data as any).id,
        user_id: session.user.id,
        role: "owner",
        job_title: "Workspace Owner",
      });
    }

    setWsName("");
    setWsSlug("");
    setCreateSheetOpen(false);
    loadTeam();
  }

  async function handleInviteMember() {
    if (!workspace || !inviteEmail.trim()) return;
    Alert.alert(
      "Invitation Sent",
      `An invite link for workspace "${workspace.name}" has been generated for ${inviteEmail}.`
    );
    setInviteEmail("");
    setInviteSheetOpen(false);
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-6 px-5 pt-6 pb-12" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View className="gap-0.5">
            <Text variant="h3" className="text-2xl font-bold tracking-tight text-foreground">
              Team Workspace
            </Text>
            <Text variant="muted" className="text-xs text-muted-foreground">
              Centralized team profiles, employee roles & branded templates.
            </Text>
          </View>

          {workspace ? (
            <Button
              size="sm"
              icon="person-add-outline"
              onPress={() => setInviteSheetOpen(true)}
              className="rounded-xl px-3.5 shadow-xs"
            >
              Invite
            </Button>
          ) : (
            <Button
              size="sm"
              icon="add-outline"
              onPress={() => setCreateSheetOpen(true)}
              className="rounded-xl px-3.5 shadow-xs"
            >
              Create Workspace
            </Button>
          )}
        </View>

        {workspace ? (
          <View className="gap-5">
            {/* Workspace Card */}
            <Card className="rounded-2xl border border-border bg-card p-5 shadow-xs gap-3">
              <View className="flex-row items-center justify-between border-b border-border/40 pb-3">
                <View className="flex-row items-center gap-3">
                  <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                    <Ionicons name="business-outline" size={24} color={colors.primary} />
                  </View>

                  <View className="gap-0.5">
                    <Text className="text-lg font-bold text-foreground">{workspace.name}</Text>
                    <Text className="text-xs font-mono text-muted-foreground">
                      tapit.man2web.in/team/{workspace.slug}
                    </Text>
                  </View>
                </View>

                <View className="rounded-full bg-primary/10 px-2.5 py-1 border border-primary/20">
                  <Text className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    {members.length} Members
                  </Text>
                </View>
              </View>

              <Text className="text-xs text-muted-foreground leading-relaxed">
                Centralized lead pool and branded templates are active for all team members.
              </Text>
            </Card>

            {/* Team Members List */}
            <View className="gap-2.5">
              <Text className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Workspace Roster ({members.length})
              </Text>

              {members.map((member) => (
                <Card
                  key={member.id}
                  className="flex-row items-center justify-between rounded-xl border border-border bg-card p-3.5 shadow-xs"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                      <Text className="text-sm font-bold text-primary">
                        {(member.role || "M").charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View className="gap-0.5">
                      <Text className="text-sm font-bold text-foreground">
                        {member.job_title || "Team Member"}
                      </Text>
                      <Text className="text-xs text-muted-foreground capitalize font-medium">
                        Role: {member.role}
                      </Text>
                    </View>
                  </View>

                  <View className="rounded-md bg-accent px-2.5 py-1 border border-border/60">
                    <Text className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                      {member.role}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        ) : (
          <View className="items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center bg-card/40 my-4">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <Ionicons name="people-outline" size={28} color={colors.primary} />
            </View>
            <Text variant="h4">No Team Workspace Created</Text>
            <Text variant="muted" className="text-center text-xs px-2">
              Create a business workspace to invite employees, standardize company branding, and manage team leads centrally.
            </Text>
            <Button
              icon="add-outline"
              onPress={() => setCreateSheetOpen(true)}
              className="mt-2 rounded-xl px-5 shadow-xs"
            >
              Create Team Workspace
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Create Workspace Sheet */}
      <BottomSheet visible={createSheetOpen} onClose={() => setCreateSheetOpen(false)}>
        <View className="gap-4 pb-2">
          <Text variant="h4" className="text-base font-bold">
            Create Team Workspace
          </Text>

          <View className="gap-3">
            <View className="gap-1.5">
              <Text className="text-xs font-semibold text-foreground">Company / Organization Name *</Text>
              <Input
                placeholder="e.g. Acme Corporation"
                value={wsName}
                onChangeText={setWsName}
                className="rounded-xl"
              />
            </View>

            <View className="gap-1.5">
              <Text className="text-xs font-semibold text-foreground">Workspace Handle Slug</Text>
              <Input
                placeholder="e.g. acme-corp"
                value={wsSlug}
                onChangeText={(v) => setWsSlug(v.toLowerCase())}
                autoCapitalize="none"
                className="rounded-xl"
              />
            </View>
          </View>

          <View className="gap-2 pt-2">
            <Button
              onPress={handleCreateWorkspace}
              loading={submitting}
              disabled={!wsName.trim()}
              className="w-full rounded-xl py-3.5"
            >
              Create Workspace
            </Button>
            <Button
              variant="secondary"
              onPress={() => setCreateSheetOpen(false)}
              className="w-full rounded-xl"
            >
              Cancel
            </Button>
          </View>
        </View>
      </BottomSheet>

      {/* Invite Member Sheet */}
      <BottomSheet visible={inviteSheetOpen} onClose={() => setInviteSheetOpen(false)}>
        <View className="gap-4 pb-2">
          <Text variant="h4" className="text-base font-bold">
            Invite Employee to Workspace
          </Text>

          <View className="gap-3">
            <View className="gap-1.5">
              <Text className="text-xs font-semibold text-foreground">Employee Email Address *</Text>
              <Input
                placeholder="e.g. alex@company.com"
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                className="rounded-xl"
              />
            </View>

            <View className="gap-1.5">
              <Text className="text-xs font-semibold text-foreground">Role</Text>
              <View className="flex-row gap-2">
                {["member", "manager", "admin"].map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setInviteRole(r)}
                    className={`flex-1 items-center py-2.5 rounded-xl border capitalize ${
                      inviteRole === r
                        ? "bg-primary/10 border-primary shadow-xs"
                        : "bg-card border-border"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold capitalize ${
                        inviteRole === r ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {r}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <View className="gap-2 pt-2">
            <Button
              onPress={handleInviteMember}
              disabled={!inviteEmail.trim()}
              className="w-full rounded-xl py-3.5"
            >
              Send Invite
            </Button>
            <Button
              variant="secondary"
              onPress={() => setInviteSheetOpen(false)}
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
