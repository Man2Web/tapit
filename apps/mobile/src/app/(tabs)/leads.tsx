import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { buildFollowupEmail, buildFollowupSmsUrl, buildFollowupWhatsAppUrl } from "@tapit/core";
import type { Database } from "@tapit/types";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/colors";
import { supabase } from "@/lib/supabase";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Lead = Database["public"]["Tables"]["leads"]["Row"];

const STATUS_FILTERS = ["all", "new", "contacted", "qualified", "closed"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || "https://tapit.man2web.in";

export default function LeadsScreen() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [followupSheetOpen, setFollowupSheetOpen] = useState(false);
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!session) return;
      if (isRefresh) setRefreshing(true);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("owner_id", session.user.id)
        .eq("is_primary", true)
        .maybeSingle();

      setProfile(profileData);

      if (profileData) {
        const { data: leadData } = await supabase
          .from("leads")
          .select("*")
          .eq("profile_id", profileData.id)
          .order("created_at", { ascending: false });

        setLeads(leadData ?? []);
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

  async function handleUpdateStatus(newStatus: string) {
    if (!selectedLead) return;
    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus })
      .eq("id", selectedLead.id);

    if (error) {
      Alert.alert("Error", "Could not update lead status.");
      return;
    }

    setLeads((prev) =>
      prev.map((l) => (l.id === selectedLead.id ? { ...l, status: newStatus } : l)),
    );
    setStatusSheetOpen(false);
  }

  function handleFollowupAction(type: "email" | "whatsapp" | "sms") {
    if (!selectedLead || !profile) return;
    const cardUrl = `${WEB_BASE_URL}/u/${profile.username}`;
    const opts = {
      leadName: selectedLead.name ?? undefined,
      leadPhone: selectedLead.phone ?? undefined,
      leadEmail: selectedLead.email ?? undefined,
      profileName: profile.display_name,
      cardUrl,
    };

    if (type === "email") {
      const { mailtoUrl } = buildFollowupEmail(opts);
      Linking.openURL(mailtoUrl);
    } else if (type === "whatsapp") {
      const waUrl = buildFollowupWhatsAppUrl(opts);
      Linking.openURL(waUrl);
    } else if (type === "sms") {
      const smsUrl = buildFollowupSmsUrl(opts);
      Linking.openURL(smsUrl);
    }
    setFollowupSheetOpen(false);
  }

  const filteredLeads = leads.filter((lead) => {
    const matchesFilter = activeFilter === "all" || lead.status === activeFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      lead.name?.toLowerCase().includes(q) ||
      lead.email?.toLowerCase().includes(q) ||
      lead.phone?.toLowerCase().includes(q) ||
      (lead.company as string | null)?.toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="gap-4 px-5 pt-12 pb-12"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text variant="h3" className="text-2xl font-bold tracking-tight text-foreground">
              Contacts
            </Text>
            <Text variant="muted" className="text-xs">
              Exchanged leads & scanned paper cards
            </Text>
          </View>

          <Button
            size="sm"
            icon="scan-outline"
            onPress={() => router.push("/scan-card")}
            className="rounded-full bg-primary px-3.5 shadow-sm"
          >
            AI Scanner
          </Button>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center rounded-2xl border border-border/80 bg-card px-3.5 py-2.5 shadow-sm">
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            placeholder="Search contacts, emails, companies..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.muted}
            className="ml-2.5 flex-1 text-sm text-foreground"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {/* Status Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
          {STATUS_FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                className={`rounded-full px-3.5 py-1.5 border transition-colors ${
                  isActive
                    ? "bg-primary border-primary"
                    : "bg-card border-border/70 active:bg-accent"
                }`}
              >
                <Text
                  className={`text-xs font-semibold capitalize ${
                    isActive ? "text-card" : "text-muted-foreground"
                  }`}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Leads List */}
        {filteredLeads.length > 0 ? (
          <View className="gap-3">
            {filteredLeads.map((lead) => (
              <View
                key={lead.id}
                className="gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Text className="text-base font-bold text-primary">
                        {(lead.name || lead.email || "C").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-base font-bold text-foreground">
                        {lead.name || "Unnamed Contact"}
                      </Text>
                      {((lead.designation as string | null) || (lead.company as string | null)) && (
                        <Text className="text-xs text-muted-foreground">
                          {[(lead.designation as string | null), (lead.company as string | null)]
                            .filter(Boolean)
                            .join(" • ")}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Status Badge */}
                  <Pressable
                    onPress={() => {
                      setSelectedLead(lead);
                      setStatusSheetOpen(true);
                    }}
                    className="flex-row items-center gap-1 rounded-full border border-border/60 bg-accent/60 px-2.5 py-1"
                  >
                    <Text className="text-xs font-semibold capitalize text-foreground">
                      {lead.status}
                    </Text>
                    <Ionicons name="chevron-down" size={12} color={colors.muted} />
                  </Pressable>
                </View>

                {/* Details */}
                <View className="gap-1 pt-1 border-t border-border/40">
                  {lead.phone && (
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="call-outline" size={14} color={colors.muted} />
                      <Text className="text-xs text-foreground">{lead.phone}</Text>
                    </View>
                  )}
                  {lead.email && (
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="mail-outline" size={14} color={colors.muted} />
                      <Text className="text-xs text-foreground">{lead.email}</Text>
                    </View>
                  )}
                </View>

                {/* Quick Action Buttons */}
                <View className="flex-row items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="default"
                    icon="send-outline"
                    onPress={() => {
                      setSelectedLead(lead);
                      setFollowupSheetOpen(true);
                    }}
                    className="flex-1 rounded-xl"
                  >
                    Follow Up
                  </Button>

                  {lead.phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      icon="call-outline"
                      onPress={() => Linking.openURL(`tel:${lead.phone}`)}
                      className="rounded-xl px-3 border-border/80"
                    >
                      Call
                    </Button>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className="items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 p-8 text-center mt-4">
            <Ionicons name="people-outline" size={40} color={colors.muted} />
            <Text variant="h4">No contacts found</Text>
            <Text variant="muted" className="text-center text-xs">
              Scan a paper business card or share your QR code to collect contacts automatically!
            </Text>
            <Button
              icon="scan-outline"
              onPress={() => router.push("/scan-card")}
              className="mt-2 rounded-full px-5"
            >
              Scan Paper Card
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Follow-up Action Sheet */}
      <BottomSheet visible={followupSheetOpen} onClose={() => setFollowupSheetOpen(false)}>
        <View className="gap-4">
          <Text variant="h4">Follow Up & Stay in Touch</Text>
          <Text variant="muted">
            Send an instant automated follow-up message to {selectedLead?.name || "this contact"}.
          </Text>

          <View className="gap-2.5 pt-2">
            <Button
              variant="outline"
              icon="mail-outline"
              onPress={() => handleFollowupAction("email")}
              className="justify-start border-border/80 bg-card py-3"
            >
              Send Follow-up Email
            </Button>
            <Button
              variant="outline"
              icon="logo-whatsapp"
              onPress={() => handleFollowupAction("whatsapp")}
              className="justify-start border-border/80 bg-card py-3"
            >
              Send WhatsApp Message
            </Button>
            <Button
              variant="outline"
              icon="chatbubble-outline"
              onPress={() => handleFollowupAction("sms")}
              className="justify-start border-border/80 bg-card py-3"
            >
              Send SMS Text
            </Button>
          </View>

          <Button variant="secondary" onPress={() => setFollowupSheetOpen(false)}>
            Cancel
          </Button>
        </View>
      </BottomSheet>

      {/* Status Picker Sheet */}
      <BottomSheet visible={statusSheetOpen} onClose={() => setStatusSheetOpen(false)}>
        <View className="gap-3">
          <Text variant="h4">Update Contact Status</Text>
          <View className="gap-2 pt-2">
            {["new", "contacted", "qualified", "closed", "dropped"].map((status) => (
              <Button
                key={status}
                variant={selectedLead?.status === status ? "default" : "outline"}
                onPress={() => handleUpdateStatus(status)}
                className="capitalize justify-start"
              >
                {status}
              </Button>
            ))}
          </View>
          <Button variant="secondary" onPress={() => setStatusSheetOpen(false)}>
            Cancel
          </Button>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
