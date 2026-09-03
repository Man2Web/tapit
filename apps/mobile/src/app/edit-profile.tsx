import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Redirect, router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ALL_TOGGLE_LINKS,
  WEB_TEMPLATES,
  formatCustomLinkValue,
  type StarterLinkDef,
  type WebTemplateId,
} from "@tapit/core";
import type { Database } from "@tapit/types";
import { Avatar, type AvatarFocusMode } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ListRow } from "@/components/ui/list-row";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { UsernameStatus } from "@/components/ui/username-status";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { colors } from "@/lib/colors";
import { supabase } from "@/lib/supabase";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileLink = Database["public"]["Tables"]["profile_links"]["Row"];
type UsernameCheckStatus = "idle" | "checking" | "available" | "taken" | "invalid";
type CustomLinkDraft = { id: string; savedId?: string; label: string; value: string };
type EditorTab = "display" | "information" | "links";
type PhotoTarget = "avatar" | "logo";

const CONTACT_LINKS = ALL_TOGGLE_LINKS.filter((l) => l.kind !== "social");
const SOCIAL_LINKS = ALL_TOGGLE_LINKS.filter((l) => l.kind === "social");

function LinkToggleRow({
  link,
  enabled,
  value,
  onToggle,
  onChangeValue,
}: {
  link: StarterLinkDef;
  enabled: boolean;
  value: string;
  onToggle: (v: boolean) => void;
  onChangeValue: (v: string) => void;
}) {
  return (
    <ListRow
      leading={
        <Ionicons
          name={link.icon as ComponentProps<typeof Ionicons>["name"]}
          size={20}
          color={colors.mutedForeground}
        />
      }
      title={link.label}
      trailing={<Switch value={enabled} onValueChange={onToggle} />}
      footer={
        enabled ? (
          <Input
            placeholder={link.placeholder}
            value={value}
            onChangeText={onChangeValue}
            autoCapitalize="none"
          />
        ) : undefined
      }
    />
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      className={cn(
        "flex-1 items-center rounded-full py-2.5 transition-colors",
        active ? "bg-primary shadow-xs" : "bg-transparent"
      )}
    >
      <Text
        className={cn("text-xs font-bold", active ? "text-white" : "text-muted-foreground")}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function EditProfileScreen() {
  const { session, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<EditorTab>("display");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  const [avatarFocusMode, setAvatarFocusMode] = useState<AvatarFocusMode>("head");
  const [selectedWebTemplate, setSelectedWebTemplate] = useState<WebTemplateId>("executive");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [newLogoUri, setNewLogoUri] = useState<string | null>(null);
  const [photoSheetTarget, setPhotoSheetTarget] = useState<PhotoTarget | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [accreditations, setAccreditations] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");

  const [originalUsername, setOriginalUsername] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameCheckStatus>("idle");
  const [usernameReason, setUsernameReason] = useState<string | null>(null);

  const [enabledLinks, setEnabledLinks] = useState<Record<string, boolean>>({});
  const [linkValues, setLinkValues] = useState<Record<string, string>>({});
  const [linkIds, setLinkIds] = useState<Record<string, string>>({});
  const [linkSearch, setLinkSearch] = useState("");

  const [customLinks, setCustomLinks] = useState<CustomLinkDraft[]>([]);
  const [removedCustomLinkIds, setRemovedCustomLinkIds] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const checkSeq = useRef(0);
  const customLinkSeq = useRef(0);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("owner_id", session.user.id)
        .eq("is_primary", true)
        .single();

      if (!profileData) {
        setLoading(false);
        return;
      }

      setProfile(profileData);
      const themeObj = (profileData.theme ?? {}) as Record<string, unknown>;
      if (typeof themeObj.avatar_focus === "string") {
        setAvatarFocusMode(themeObj.avatar_focus as AvatarFocusMode);
      }
      if (typeof themeObj.template === "string") {
        setSelectedWebTemplate(themeObj.template as WebTemplateId);
      }
      const [firstFromName, ...restFromName] = profileData.display_name.trim().split(/\s+/);
      setFirstName(profileData.first_name ?? firstFromName ?? "");
      setLastName(profileData.last_name ?? restFromName.join(" "));
      setAccreditations(profileData.accreditations ?? "");
      setPronouns(profileData.pronouns ?? "");
      setDesignation(profileData.designation ?? "");
      setDepartment(profileData.department ?? "");
      setCompany(profileData.company ?? "");
      setBio(profileData.bio ?? "");
      setAvatarUrl(profileData.avatar_url);
      setLogoUrl(profileData.logo_url);
      setOriginalUsername(profileData.username);
      setUsername(profileData.username);

      const { data: links } = await supabase
        .from("profile_links")
        .select("*")
        .eq("profile_id", profileData.id);

      const enabled: Record<string, boolean> = {};
      const values: Record<string, string> = {};
      const ids: Record<string, string> = {};
      const custom: CustomLinkDraft[] = [];
      for (const link of (links ?? []) as ProfileLink[]) {
        if (link.kind === "custom") {
          custom.push({ id: `saved-${link.id}`, savedId: link.id, label: link.label, value: link.value });
          continue;
        }
        const def = ALL_TOGGLE_LINKS.find((l) =>
          l.platform ? l.platform === link.platform : l.kind === link.kind,
        );
        if (!def) continue;
        enabled[def.key] = true;
        values[def.key] = link.value;
        ids[def.key] = link.id;
      }
      setEnabledLinks(enabled);
      setLinkValues(values);
      setLinkIds(ids);
      setCustomLinks(custom);
      setLoading(false);
    })();
  }, [session]);

  useEffect(() => {
    if (!username || username === originalUsername) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    const seq = ++checkSeq.current;
    const timeout = setTimeout(async () => {
      const { data, error } = await supabase.rpc("is_username_available", {
        check_username: username,
      });
      if (checkSeq.current !== seq) return;
      if (error || !data) {
        setUsernameStatus(error ? "invalid" : "taken");
        setUsernameReason(error ? "Couldn't check right now — try again." : "That username is taken.");
      } else {
        setUsernameStatus("available");
        setUsernameReason(null);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [username, originalUsername]);

  async function pickImage(source: "camera" | "library", target: PhotoTarget) {
    setPhotoSheetTarget(null);
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.8,
            allowsEditing: true,
            aspect: [1, 1],
          });

    if (!result.canceled && result.assets[0]) {
      if (target === "avatar") setNewAvatarUri(result.assets[0].uri);
      else setNewLogoUri(result.assets[0].uri);
    }
  }

  async function uploadImageIfChanged(
    uri: string | null,
    bucket: "avatars" | "logos",
    fallbackUrl: string | null,
  ): Promise<string | null> {
    if (!uri || !session) return fallbackUrl;
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.split("/")[1] ?? "jpg";
    const path = `${session.user.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
      contentType,
      upsert: true,
    });
    if (error) {
      setSubmitError(`${bucket === "avatars" ? "Photo" : "Logo"} upload failed: ${error.message}`);
      return fallbackUrl;
    }
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async function handleSave() {
    if (!session || !profile) return;
    if (username !== originalUsername && usernameStatus !== "available") return;

    setSubmitting(true);
    setSubmitError(null);

    const newAvatarUrl = await uploadImageIfChanged(newAvatarUri, "avatars", avatarUrl);
    const newLogoUrl = await uploadImageIfChanged(newLogoUri, "logos", logoUrl);
    const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();

    const existingTheme = (profile.theme ?? {}) as Record<string, unknown>;
    const updatedTheme = {
      ...existingTheme,
      avatar_focus: avatarFocusMode,
      template: selectedWebTemplate,
    };

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        username,
        display_name: displayName,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        accreditations: accreditations.trim() || null,
        pronouns: pronouns.trim() || null,
        designation: designation.trim() || null,
        department: department.trim() || null,
        company: company.trim() || null,
        bio: bio.trim() || null,
        avatar_url: newAvatarUrl,
        logo_url: newLogoUrl,
        theme: updatedTheme,
      })
      .eq("id", profile.id);

    if (profileError) {
      setSubmitting(false);
      setSubmitError(
        profileError.code === "23505"
          ? "That username was just taken — try another."
          : profileError.message,
      );
      return;
    }

    for (const link of ALL_TOGGLE_LINKS) {
      const raw = linkValues[link.key];
      const existingId = linkIds[link.key];
      const isEnabled = enabledLinks[link.key] && !!raw?.trim();

      if (isEnabled) {
        const value = link.formatValue(raw);
        if (existingId) {
          await supabase.from("profile_links").update({ value, icon: link.icon }).eq("id", existingId);
        } else {
          await supabase.from("profile_links").insert({
            profile_id: profile.id,
            kind: link.kind,
            platform: link.platform ?? null,
            label: link.label,
            value,
            icon: link.icon,
            position: ALL_TOGGLE_LINKS.indexOf(link),
          });
        }
      } else if (existingId) {
        await supabase.from("profile_links").delete().eq("id", existingId);
      }
    }

    for (const id of removedCustomLinkIds) {
      await supabase.from("profile_links").delete().eq("id", id);
    }
    for (const [index, draft] of customLinks.entries()) {
      const label = draft.label.trim();
      const raw = draft.value.trim();
      if (!label || !raw) continue;
      const value = formatCustomLinkValue(raw);
      if (draft.savedId) {
        await supabase.from("profile_links").update({ label, value }).eq("id", draft.savedId);
      } else {
        await supabase.from("profile_links").insert({
          profile_id: profile.id,
          kind: "custom",
          platform: null,
          label,
          value,
          position: ALL_TOGGLE_LINKS.length + index,
        });
      }
    }

    await refreshProfile();
    setSubmitting(false);
    router.replace("/");
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6 pt-12">
          <Text variant="muted" className="text-center">
            No card yet — finish onboarding first.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="gap-3 px-5 pt-8">
        <View className="flex-row items-center justify-between">
          <Button variant="ghost" size="sm" icon="arrow-back" onPress={() => router.back()}>
            Back
          </Button>
          <Text variant="h4" className="text-base font-bold text-foreground">
            Edit Profile
          </Text>
          <View className="w-12" />
        </View>

        {/* Segmented Tab Control */}
        <View className="flex-row gap-1 rounded-full bg-accent/60 p-1 border border-border/50">
          <TabButton label="Style & Photo" active={tab === "display"} onPress={() => setTab("display")} />
          <TabButton
            label="Information"
            active={tab === "information"}
            onPress={() => setTab("information")}
          />
          <TabButton label="Links" active={tab === "links"} onPress={() => setTab("links")} />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-6 pt-5"
        keyboardShouldPersistTaps="handled"
      >
        {tab === "display" && (
          <View className="gap-5 pt-1">
            {/* 1. Web Card Template Selection Module */}
            <View className="gap-3 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
              <View className="flex-row items-center justify-between border-b border-border/40 pb-3">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
                  <Text className="text-base font-bold text-foreground">Web Profile Template</Text>
                </View>
                <Text className="text-xs font-semibold text-primary">5 Available</Text>
              </View>

              <Text variant="muted" className="text-xs">
                Select the web card template your visitors see when scanning your NFC card or link:
              </Text>

              <View className="gap-2.5 pt-1">
                {WEB_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedWebTemplate === tmpl.id;
                  return (
                    <Pressable
                      key={tmpl.id}
                      onPress={() => setSelectedWebTemplate(tmpl.id)}
                      className={cn(
                        "flex-row items-center justify-between rounded-2xl border p-4 transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-xs"
                          : "border-border/60 bg-background active:bg-accent"
                      )}
                    >
                      <View className="flex-1 gap-1 pr-3">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-sm font-bold text-foreground">{tmpl.name}</Text>
                          {isSelected && (
                            <View className="rounded-full bg-primary px-2 py-0.5">
                              <Text className="text-[10px] font-bold text-white uppercase">Selected</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-xs text-muted-foreground">{tmpl.description}</Text>
                      </View>

                      <Ionicons
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                        size={22}
                        color={isSelected ? colors.primary : colors.muted}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 2. Profile Photo Module */}
            <View className="items-center gap-3 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
              <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Profile Photo
              </Text>

              <Pressable onPress={() => setPhotoSheetTarget("avatar")} className="my-2">
                <Avatar
                  uri={newAvatarUri ?? avatarUrl}
                  size={110}
                  focusMode={avatarFocusMode}
                  showEditBadge
                />
              </Pressable>

              <Button
                variant="outline"
                size="sm"
                icon="camera-outline"
                onPress={() => setPhotoSheetTarget("avatar")}
                className="rounded-full px-5 border-border/70"
              >
                Change Profile Photo
              </Button>

              {/* Photo Framing Mode Segmented Chips */}
              {(newAvatarUri || avatarUrl) && (
                <View className="mt-2 w-full items-center gap-2 rounded-2xl border border-border/40 bg-accent/30 p-3">
                  <Text className="text-xs font-semibold text-foreground">
                    Photo Framing Mode
                  </Text>
                  <View className="flex-row items-center justify-center gap-1.5 rounded-full bg-background/80 p-1 border border-border/60">
                    <Pressable
                      onPress={() => setAvatarFocusMode("head")}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full",
                        avatarFocusMode === "head" ? "bg-primary shadow-xs" : "bg-transparent"
                      )}
                    >
                      <Text className={cn("text-xs font-bold", avatarFocusMode === "head" ? "text-white" : "text-muted-foreground")}>
                        Focus Head
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setAvatarFocusMode("center")}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full",
                        avatarFocusMode === "center" ? "bg-primary shadow-xs" : "bg-transparent"
                      )}
                    >
                      <Text className={cn("text-xs font-bold", avatarFocusMode === "center" ? "text-white" : "text-muted-foreground")}>
                        Center
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setAvatarFocusMode("fit")}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full",
                        avatarFocusMode === "fit" ? "bg-primary shadow-xs" : "bg-transparent"
                      )}
                    >
                      <Text className={cn("text-xs font-bold", avatarFocusMode === "fit" ? "text-white" : "text-muted-foreground")}>
                        Full Photo
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>

            {/* 3. Company Logo Module */}
            <View className="items-center gap-3 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
              <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Company Brand Logo
              </Text>

              <Pressable onPress={() => setPhotoSheetTarget("logo")} className="my-2">
                <Avatar uri={newLogoUri ?? logoUrl} size={84} fallbackIcon="business-outline" showEditBadge />
              </Pressable>

              <Button
                variant="outline"
                size="sm"
                icon="image-outline"
                onPress={() => setPhotoSheetTarget("logo")}
                className="rounded-full px-5 border-border/70"
              >
                {newLogoUri ?? logoUrl ? "Change Company Logo" : "Upload Company Logo"}
              </Button>
            </View>
          </View>
        )}

        {tab === "information" && (
          <View className="gap-4">
            <Field label="First Name">
              <Input value={firstName} onChangeText={setFirstName} className="rounded-2xl" />
            </Field>
            <Field label="Last Name">
              <Input value={lastName} onChangeText={setLastName} className="rounded-2xl" />
            </Field>
            <Field label="Accreditations">
              <Input placeholder="e.g. MD, PhD" value={accreditations} onChangeText={setAccreditations} className="rounded-2xl" />
            </Field>
            <Field label="Pronouns">
              <Input placeholder="e.g. she/her" value={pronouns} onChangeText={setPronouns} className="rounded-2xl" />
            </Field>

            <Text variant="large" className="mt-2 font-bold text-foreground">
              Affiliation & Bio
            </Text>
            <Field label="Title / Position">
              <Input value={designation} onChangeText={setDesignation} className="rounded-2xl" />
            </Field>
            <Field label="Department">
              <Input value={department} onChangeText={setDepartment} className="rounded-2xl" />
            </Field>
            <Field label="Company / Organization">
              <Input value={company} onChangeText={setCompany} className="rounded-2xl" />
            </Field>
            <Field label="Bio / Slogan">
              <Input
                placeholder="A line or two about you..."
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                className="min-h-20 rounded-2xl"
              />
            </Field>

            <Field label="Profile Handle">
              <View className="flex-row items-center rounded-2xl border border-border px-4 py-3 bg-card">
                <Text className="text-muted-foreground text-sm font-medium">tapit.man2web.in/u/</Text>
                <Input
                  value={username}
                  onChangeText={(v) => setUsername(v.toLowerCase())}
                  autoCapitalize="none"
                  className="flex-1 border-0 p-0 text-sm text-foreground font-bold"
                />
              </View>
              {username !== originalUsername && (
                <UsernameStatus status={usernameStatus} reason={usernameReason} />
              )}
            </Field>
          </View>
        )}

        {tab === "links" && (
          <View className="gap-4">
            {(() => {
              const query = linkSearch.trim().toLowerCase();
              const matches = (link: StarterLinkDef) => link.label.toLowerCase().includes(query);
              const contactMatches = CONTACT_LINKS.filter(matches);
              const socialMatches = SOCIAL_LINKS.filter(matches);
              const contactCount = CONTACT_LINKS.filter((l) => enabledLinks[l.key]).length;
              const socialCount = SOCIAL_LINKS.filter((l) => enabledLinks[l.key]).length;

              return (
                <>
                  <View className="flex-row items-center gap-2 rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-xs">
                    <Ionicons name="search-outline" size={18} color={colors.muted} />
                    <Input
                      placeholder="Search links (Instagram, WhatsApp, LinkedIn...)"
                      value={linkSearch}
                      onChangeText={setLinkSearch}
                      autoCapitalize="none"
                      className="flex-1 border-0 p-0 text-sm"
                    />
                  </View>

                  {contactMatches.length > 0 && (
                    <>
                      <Text variant="large" className="mt-2 font-bold text-foreground">
                        Contact & Payments{contactCount > 0 ? ` (${contactCount} active)` : ""}
                      </Text>
                      {contactMatches.map((link) => (
                        <LinkToggleRow
                          key={link.key}
                          link={link}
                          enabled={!!enabledLinks[link.key]}
                          value={linkValues[link.key] ?? ""}
                          onToggle={(v) => setEnabledLinks((prev) => ({ ...prev, [link.key]: v }))}
                          onChangeValue={(v) => setLinkValues((prev) => ({ ...prev, [link.key]: v }))}
                        />
                      ))}
                    </>
                  )}

                  {socialMatches.length > 0 && (
                    <>
                      <Text variant="large" className="mt-2 font-bold text-foreground">
                        Social Networks{socialCount > 0 ? ` (${socialCount} active)` : ""}
                      </Text>
                      {socialMatches.map((link) => (
                        <LinkToggleRow
                          key={link.key}
                          link={link}
                          enabled={!!enabledLinks[link.key]}
                          value={linkValues[link.key] ?? ""}
                          onToggle={(v) => setEnabledLinks((prev) => ({ ...prev, [link.key]: v }))}
                          onChangeValue={(v) => setLinkValues((prev) => ({ ...prev, [link.key]: v }))}
                        />
                      ))}
                    </>
                  )}
                </>
              );
            })()}

            <Text variant="large" className="mt-2 font-bold text-foreground">
              Custom Links
            </Text>
            {customLinks.map((draft) => (
              <Card key={draft.id} className="gap-3 rounded-2xl border border-border/60 p-4">
                <Field label="Label">
                  <View className="flex-row items-center gap-2">
                    <Input
                      placeholder="e.g. Portfolio"
                      value={draft.label}
                      onChangeText={(v) =>
                        setCustomLinks((prev) =>
                          prev.map((d) => (d.id === draft.id ? { ...d, label: v } : d)),
                        )
                      }
                      className="flex-1 rounded-xl"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      icon="trash-outline"
                      onPress={() => {
                        if (draft.savedId) {
                          setRemovedCustomLinkIds((prev) => [...prev, draft.savedId!]);
                        }
                        setCustomLinks((prev) => prev.filter((d) => d.id !== draft.id));
                      }}
                    />
                  </View>
                </Field>
                <Field label="URL">
                  <Input
                    placeholder="yoursite.com/page"
                    value={draft.value}
                    onChangeText={(v) =>
                      setCustomLinks((prev) =>
                        prev.map((d) => (d.id === draft.id ? { ...d, value: v } : d)),
                      )
                    }
                    autoCapitalize="none"
                    className="rounded-xl"
                  />
                </Field>
              </Card>
            ))}
            <Button
              variant="secondary"
              icon="add-circle-outline"
              onPress={() =>
                setCustomLinks((prev) => [
                  ...prev,
                  { id: `new-${customLinkSeq.current++}`, label: "", value: "" },
                ])
              }
              className="rounded-full py-3"
            >
              Add Custom Link
            </Button>
          </View>
        )}
      </ScrollView>

      <View className="gap-2 px-5 pb-8 pt-2">
        {submitError && (
          <View className="flex-row items-center gap-1.5 px-1">
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text className="text-xs text-danger">{submitError}</Text>
          </View>
        )}

        <View className="flex-row gap-3">
          <Button
            variant="secondary"
            icon="close"
            onPress={() => router.replace("/")}
            className="flex-1 rounded-full py-3.5"
          >
            Cancel
          </Button>
          <Button
            icon="checkmark"
            iconPosition="right"
            onPress={handleSave}
            loading={submitting}
            disabled={!firstName.trim() || (username !== originalUsername && usernameStatus !== "available")}
            className="flex-1 rounded-full py-3.5 shadow-sm"
          >
            Save Changes
          </Button>
        </View>
      </View>

      {/* Photo Source Bottom Sheet */}
      <BottomSheet visible={photoSheetTarget !== null} onClose={() => setPhotoSheetTarget(null)}>
        <View className="gap-3 pb-2">
          <Text variant="h4" className="text-center font-bold">
            {photoSheetTarget === "avatar" ? "Profile Photo" : "Company Logo"}
          </Text>

          <View className="gap-2.5 pt-2">
            <Button
              variant="outline"
              icon="camera-outline"
              onPress={() => pickImage("camera", photoSheetTarget ?? "avatar")}
              className="rounded-full py-3.5 justify-start border-border/70"
            >
              Take Photo
            </Button>
            <Button
              variant="outline"
              icon="images-outline"
              onPress={() => pickImage("library", photoSheetTarget ?? "avatar")}
              className="rounded-full py-3.5 justify-start border-border/70"
            >
              Choose from Photos Library
            </Button>
          </View>

          <Button variant="secondary" onPress={() => setPhotoSheetTarget(null)} className="rounded-full mt-1">
            Cancel
          </Button>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
