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
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Contacts from "expo-contacts";
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
const DELETED_LEADS_STORAGE_KEY = "tapit_deleted_lead_ids";

export default function LeadsScreen() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [activeStatusFilter, setActiveStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Sheets & Confirmation
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [followupSheetOpen, setFollowupSheetOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingToPhone, setSavingToPhone] = useState(false);

  // Manual Add Form State
  const [addName, setAddName] = useState("");
  const [addDesignation, setAddDesignation] = useState("");
  const [addCompany, setAddCompany] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addingLead, setAddingLead] = useState(false);

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

      // Read locally deleted lead IDs
      let deletedIds: string[] = [];
      try {
        const stored = await AsyncStorage.getItem(DELETED_LEADS_STORAGE_KEY);
        if (stored) {
          deletedIds = JSON.parse(stored);
        }
      } catch (err) {
        console.warn("Error reading deleted leads from storage:", err);
      }

      if (profileData) {
        const { data: leadData } = await supabase
          .from("leads")
          .select("*")
          .eq("profile_id", profileData.id)
          .neq("status", "dropped")
          .order("created_at", { ascending: false });

        const activeLeads = (leadData ?? []).filter(
          (lead) => !deletedIds.includes(lead.id) && lead.status !== "dropped"
        );

        setLeads(activeLeads);
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
      Alert.alert("Error", "Could not update contact status.");
      return;
    }

    setLeads((prev) =>
      prev.map((l) => (l.id === selectedLead.id ? { ...l, status: newStatus } : l)),
    );
    setSelectedLead((prev) => (prev ? { ...prev, status: newStatus } : null));
  }

  async function handleSaveToDeviceContacts() {
    if (!selectedLead) return;
    setSavingToPhone(true);

    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        setSavingToPhone(false);
        Alert.alert(
          "Permission Required",
          "Please grant contacts permission to save contacts to your device's native address book."
        );
        return;
      }

      const designation = (selectedLead as Record<string, unknown>).designation as string | null;
      const company = (selectedLead as Record<string, unknown>).company as string | null;
      const notes = (selectedLead as Record<string, unknown>).notes as string | null;

      const fullName = (selectedLead.name || "Contact").trim();
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || "Contact";
      const lastName = nameParts.slice(1).join(" ") || "";

      const contact: any = {
        name: fullName,
        firstName,
        lastName,
        jobTitle: designation || undefined,
        company: company || undefined,
        phoneNumbers: selectedLead.phone
          ? [{ label: "mobile", number: selectedLead.phone }]
          : undefined,
        emails: selectedLead.email ? [{ label: "work", email: selectedLead.email }] : undefined,
        note: notes || undefined,
      };

      try {
        await Contacts.presentFormAsync(null, contact);
        setSavingToPhone(false);
      } catch {
        const contactId = await Contacts.addContactAsync(contact);
        setSavingToPhone(false);

        if (contactId) {
          Alert.alert(
            "Saved to Phone! 📱",
            `${fullName} has been saved directly to your phone's native address book.`
          );
        }
      }
    } catch (err: any) {
      setSavingToPhone(false);
      console.error("Error saving contact to phone:", err);
      Alert.alert("Error", err.message || "Could not save to native phone contacts.");
    }
  }

  async function executeDeleteContact(leadId: string) {
    setDeleting(true);

    // 1. Instantly update local state
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    setConfirmDelete(false);
    setDetailSheetOpen(false);
    setSelectedLead(null);

    // 2. Persist deleted ID locally so refresh never shows it again
    try {
      const stored = await AsyncStorage.getItem(DELETED_LEADS_STORAGE_KEY);
      const existing: string[] = stored ? JSON.parse(stored) : [];
      if (!existing.includes(leadId)) {
        existing.push(leadId);
        await AsyncStorage.setItem(DELETED_LEADS_STORAGE_KEY, JSON.stringify(existing));
      }
    } catch (err) {
      console.warn("Failed to persist deleted lead ID to storage:", err);
    }

    // 3. Remote deletion on Supabase
    try {
      let { error } = await supabase.rpc("delete_lead" as any, { p_lead_id: leadId });

      if (error) {
        console.warn("delete_lead RPC error, trying raw delete:", error);
        const { data, error: delErr } = await supabase
          .from("leads")
          .delete()
          .eq("id", leadId)
          .select("id");

        error = delErr;

        if (!error && (!data || data.length === 0)) {
          console.warn("Raw delete returned 0 rows, updating status to dropped...");
          await supabase.from("leads").update({ status: "dropped" }).eq("id", leadId);
        }
      }
    } catch (err) {
      console.warn("Remote delete exception:", err);
    }

    setDeleting(false);
  }

  async function handleAddLeadSubmit() {
    if (!session || !profile) return;
    if (!addName.trim() && !addPhone.trim() && !addEmail.trim()) {
      Alert.alert("Required", "Please provide a Name, Phone, or Email.");
      return;
    }

    setAddingLead(true);

    const { error } = await supabase.rpc("submit_lead", {
      p_username: profile.username,
      p_name: addName.trim() || undefined,
      p_phone: addPhone.trim() || undefined,
      p_email: addEmail.trim() || undefined,
      p_company: addCompany.trim() || undefined,
      p_designation: addDesignation.trim() || undefined,
      p_notes: addNotes.trim() || undefined,
      p_source: "manual",
    });

    setAddingLead(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setAddName("");
    setAddDesignation("");
    setAddCompany("");
    setAddPhone("");
    setAddEmail("");
    setAddNotes("");
    setAddSheetOpen(false);
    loadData(true);
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

  // Filter logic
  const filteredLeads = leads.filter((lead) => {
    if (lead.status === "dropped") return false;
    const matchesStatus = activeStatusFilter === "all" || lead.status === activeStatusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      lead.name?.toLowerCase().includes(q) ||
      lead.email?.toLowerCase().includes(q) ||
      lead.phone?.toLowerCase().includes(q) ||
      ((lead as Record<string, unknown>).company as string | null)?.toLowerCase().includes(q) ||
      ((lead as Record<string, unknown>).designation as string | null)?.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
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
        contentContainerClassName="gap-4 px-5 pt-8 pb-12"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
          />
        }
      >
        {/* Apple HIG Header */}
        <View className="flex-row items-center justify-between">
          <View>
            <Text variant="h3" className="text-2xl font-bold tracking-tight text-foreground">
              Contacts
            </Text>
            <Text variant="muted" className="text-xs">
              {filteredLeads.length} {filteredLeads.length === 1 ? "contact" : "contacts"} saved
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              icon="add-outline"
              onPress={() => setAddSheetOpen(true)}
              className="rounded-full px-3.5 border-border/80"
            >
              Add
            </Button>
            <Button
              size="sm"
              icon="scan-outline"
              onPress={() => router.push("/scan-card")}
              className="rounded-full bg-primary px-3.5 shadow-sm"
            >
              Scan Card
            </Button>
          </View>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center rounded-2xl border border-border/60 bg-card px-3.5 py-2.5 shadow-sm">
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            placeholder="Search contacts or companies..."
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
            const isActive = activeStatusFilter === filter;
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveStatusFilter(filter)}
                className={`rounded-full px-4 py-2 border transition-colors ${
                  isActive
                    ? "bg-primary border-primary shadow-sm"
                    : "bg-card border-border/60 active:bg-accent"
                }`}
              >
                <Text
                  className={`text-xs font-semibold capitalize ${
                    isActive ? "text-white" : "text-muted-foreground"
                  }`}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Clean Contact Cards List */}
        {filteredLeads.length > 0 ? (
          <View className="gap-3">
            {filteredLeads.map((lead) => {
              const designation = (lead as Record<string, unknown>).designation as string | null;
              const company = (lead as Record<string, unknown>).company as string | null;

              return (
                <Pressable
                  key={lead.id}
                  onPress={() => {
                    setSelectedLead(lead);
                    setConfirmDelete(false);
                    setDetailSheetOpen(true);
                  }}
                  className="gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm active:opacity-90"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3.5 flex-1">
                      <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                        <Text className="text-base font-bold text-primary">
                          {(lead.name || lead.email || "C").charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      <View className="flex-1">
                        <Text className="text-base font-bold text-foreground" numberOfLines={1}>
                          {lead.name || "Unnamed Contact"}
                        </Text>
                        {designation || company ? (
                          <Text className="text-xs text-muted-foreground font-medium" numberOfLines={1}>
                            {[designation, company].filter((i): i is string => Boolean(i)).join(" • ")}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View className="flex-row items-center gap-1 rounded-full border border-border/40 bg-accent/50 px-2.5 py-1">
                      <Text className="text-xs font-semibold capitalize text-foreground">
                        {lead.status}
                      </Text>
                      <Ionicons name="chevron-forward" size={12} color={colors.muted} />
                    </View>
                  </View>

                  {/* Phone & Email Rows */}
                  {(lead.phone || lead.email) ? (
                    <View className="gap-1.5 pt-2 border-t border-border/30">
                      {lead.phone ? (
                        <View className="flex-row items-center gap-2">
                          <Ionicons name="call-outline" size={14} color={colors.muted} />
                          <Text className="text-xs text-foreground font-medium">{lead.phone}</Text>
                        </View>
                      ) : null}
                      {lead.email ? (
                        <View className="flex-row items-center gap-2">
                          <Ionicons name="mail-outline" size={14} color={colors.muted} />
                          <Text className="text-xs text-foreground font-medium">{lead.email}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Quick Action Pill Buttons */}
                  <View className="flex-row items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="default"
                      icon="send-outline"
                      onPress={() => {
                        setSelectedLead(lead);
                        setFollowupSheetOpen(true);
                      }}
                      className="flex-1 rounded-full py-2"
                    >
                      Follow Up
                    </Button>

                    {lead.phone ? (
                      <Button
                        size="sm"
                        variant="outline"
                        icon="call-outline"
                        onPress={() => Linking.openURL(`tel:${lead.phone}`)}
                        className="rounded-full px-4 border-border/70"
                      >
                        Call
                      </Button>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View className="items-center justify-center gap-3 rounded-3xl border border-dashed border-border/80 p-8 text-center mt-4 bg-card/40">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Ionicons name="people-outline" size={28} color={colors.primary} />
            </View>
            <Text variant="h4">No contacts found</Text>
            <Text variant="muted" className="text-center text-xs">
              Scan a paper business card or share your QR code to collect contacts automatically!
            </Text>
            <Button
              icon="scan-outline"
              onPress={() => router.push("/scan-card")}
              className="mt-2 rounded-full px-5 shadow-sm"
            >
              Scan Business Card
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Apple HIG Contact Detail Sheet */}
      <BottomSheet visible={detailSheetOpen} onClose={() => setDetailSheetOpen(false)}>
        {selectedLead ? (
          <View className="gap-4 pb-2">
            {!confirmDelete ? (
              <>
                <View className="items-center gap-2 text-center pt-1">
                  <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20 shadow-sm">
                    <Text className="text-2xl font-bold text-primary">
                      {(selectedLead.name || selectedLead.email || "C").charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <Text variant="h4" className="text-center text-lg font-bold">
                    {selectedLead.name || "Contact Details"}
                  </Text>

                  {(((selectedLead as Record<string, unknown>).designation as string | null) || ((selectedLead as Record<string, unknown>).company as string | null)) ? (
                    <Text className="text-xs font-medium text-muted-foreground text-center">
                      {[((selectedLead as Record<string, unknown>).designation as string | null), ((selectedLead as Record<string, unknown>).company as string | null)]
                        .filter((item): item is string => Boolean(item))
                        .join(" • ")}
                    </Text>
                  ) : null}
                </View>

                {/* Quick Actions Bar */}
                <View className="flex-row gap-2 pt-2">
                  {selectedLead.phone ? (
                    <Button
                      size="sm"
                      variant="outline"
                      icon="call-outline"
                      onPress={() => Linking.openURL(`tel:${selectedLead.phone}`)}
                      className="flex-1 rounded-full"
                    >
                      Call
                    </Button>
                  ) : null}

                  {selectedLead.email ? (
                    <Button
                      size="sm"
                      variant="outline"
                      icon="mail-outline"
                      onPress={() => Linking.openURL(`mailto:${selectedLead.email}`)}
                      className="flex-1 rounded-full"
                    >
                      Email
                    </Button>
                  ) : null}

                  <Button
                    size="sm"
                    variant="default"
                    icon="send-outline"
                    onPress={() => {
                      setDetailSheetOpen(false);
                      setFollowupSheetOpen(true);
                    }}
                    className="flex-1 rounded-full"
                  >
                    Follow Up
                  </Button>
                </View>

                {/* Save to Native Phone Address Book */}
                <Button
                  variant="secondary"
                  icon="person-add-outline"
                  loading={savingToPhone}
                  onPress={handleSaveToDeviceContacts}
                  className="rounded-full w-full py-3 border border-border/60"
                >
                  Save to Mobile Address Book
                </Button>

                {/* Status Picker Selector */}
                <View className="gap-1.5 pt-2">
                  <Text className="text-xs font-semibold text-muted-foreground">Status</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                    {["new", "contacted", "qualified", "closed", "dropped"].map((st) => {
                      const isActive = selectedLead.status === st;
                      return (
                        <Pressable
                          key={st}
                          onPress={() => handleUpdateStatus(st)}
                          className={`rounded-full px-4 py-1.5 border capitalize ${
                            isActive
                              ? "bg-primary border-primary shadow-sm"
                              : "bg-card border-border/70 active:bg-accent"
                          }`}
                        >
                          <Text
                            className={`text-xs font-semibold ${
                              isActive ? "text-white" : "text-foreground"
                            }`}
                          >
                            {st}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Trigger Inline Delete Confirmation */}
                <View className="pt-3 border-t border-border/50">
                  <Button
                    variant="destructive"
                    icon="trash-outline"
                    onPress={() => setConfirmDelete(true)}
                    className="rounded-full w-full py-3"
                  >
                    Delete Contact
                  </Button>
                </View>
              </>
            ) : (
              /* Inline Confirm Delete View */
              <View className="gap-4 py-2">
                <View className="items-center gap-2 text-center">
                  <View className="h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                    <Ionicons name="trash-outline" size={28} color={colors.danger} />
                  </View>
                  <Text variant="h4" className="text-center text-lg font-bold text-foreground">
                    Delete Contact?
                  </Text>
                  <Text variant="muted" className="text-center text-xs px-4">
                    Are you sure you want to delete {selectedLead.name || "this contact"}? This action cannot be undone.
                  </Text>
                </View>

                <View className="gap-2.5 pt-2">
                  <Button
                    variant="destructive"
                    icon="trash-outline"
                    loading={deleting}
                    onPress={() => executeDeleteContact(selectedLead.id)}
                    className="rounded-full w-full py-3.5 shadow-sm"
                  >
                    Yes, Delete Contact
                  </Button>
                  <Button
                    variant="secondary"
                    onPress={() => setConfirmDelete(false)}
                    className="rounded-full w-full"
                  >
                    Cancel
                  </Button>
                </View>
              </View>
            )}
          </View>
        ) : null}
      </BottomSheet>

      {/* Manual Add Contact Sheet */}
      <BottomSheet visible={addSheetOpen} onClose={() => setAddSheetOpen(false)}>
        <View className="gap-3 pb-2">
          <Text variant="h4">Add Contact</Text>
          <View className="gap-2.5 pt-1">
            <TextInput
              placeholder="Full Name"
              value={addName}
              onChangeText={setAddName}
              placeholderTextColor={colors.muted}
              className="rounded-2xl border border-border/70 bg-card px-3.5 py-3 text-sm text-foreground"
            />
            <View className="flex-row gap-2.5">
              <TextInput
                placeholder="Title (e.g. Director)"
                value={addDesignation}
                onChangeText={setAddDesignation}
                placeholderTextColor={colors.muted}
                className="flex-1 rounded-2xl border border-border/70 bg-card px-3.5 py-3 text-sm text-foreground"
              />
              <TextInput
                placeholder="Company (e.g. Acme)"
                value={addCompany}
                onChangeText={setAddCompany}
                placeholderTextColor={colors.muted}
                className="flex-1 rounded-2xl border border-border/70 bg-card px-3.5 py-3 text-sm text-foreground"
              />
            </View>
            <TextInput
              placeholder="Phone Number"
              value={addPhone}
              onChangeText={setAddPhone}
              keyboardType="phone-pad"
              placeholderTextColor={colors.muted}
              className="rounded-2xl border border-border/70 bg-card px-3.5 py-3 text-sm text-foreground"
            />
            <TextInput
              placeholder="Email Address"
              value={addEmail}
              onChangeText={setAddEmail}
              keyboardType="email-address"
              placeholderTextColor={colors.muted}
              className="rounded-2xl border border-border/70 bg-card px-3.5 py-3 text-sm text-foreground"
            />
            <TextInput
              placeholder="Note or Memo (optional)"
              value={addNotes}
              onChangeText={setAddNotes}
              placeholderTextColor={colors.muted}
              className="rounded-2xl border border-border/70 bg-card px-3.5 py-3 text-sm text-foreground"
            />
          </View>

          <Button
            icon="checkmark-outline"
            onPress={handleAddLeadSubmit}
            loading={addingLead}
            className="mt-2 rounded-full py-3.5 shadow-sm"
          >
            Save Contact
          </Button>
        </View>
      </BottomSheet>

      {/* Follow-up Action Sheet */}
      <BottomSheet visible={followupSheetOpen} onClose={() => setFollowupSheetOpen(false)}>
        <View className="gap-4">
          <Text variant="h4">Follow Up</Text>
          <Text variant="muted" className="text-xs">
            Send an instant automated follow-up message to {selectedLead?.name || "this contact"}.
          </Text>

          <View className="gap-2.5 pt-1">
            <Button
              variant="outline"
              icon="mail-outline"
              onPress={() => handleFollowupAction("email")}
              className="justify-start border-border/80 bg-card py-3 rounded-2xl"
            >
              Send Follow-up Email
            </Button>
            <Button
              variant="outline"
              icon="logo-whatsapp"
              onPress={() => handleFollowupAction("whatsapp")}
              className="justify-start border-border/80 bg-card py-3 rounded-2xl"
            >
              Send WhatsApp Message
            </Button>
            <Button
              variant="outline"
              icon="chatbubble-outline"
              onPress={() => handleFollowupAction("sms")}
              className="justify-start border-border/80 bg-card py-3 rounded-2xl"
            >
              Send SMS Text
            </Button>
          </View>

          <Button variant="secondary" onPress={() => setFollowupSheetOpen(false)} className="rounded-full">
            Cancel
          </Button>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
